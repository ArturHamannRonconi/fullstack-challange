import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../../src/domain/entities/operation/operation.entity";
import { ReserveEntity } from "../../../../src/domain/entities/reserve/reserve.entity";
import { OperationTypeValueObject } from "../../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../../src/domain/wallet.aggregate-root";
import { WalletResponseMapper } from "../../../../src/presentation/mappers/wallet-response.mapper";

const USER_UUID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

function money(cents: bigint) {
  return MoneyValueObject.init({ value: cents }).result as MoneyValueObject;
}

function operation(type: "DEPOSIT" | "WITHDRAW" | "WIN" | "LOST" | "RESERVE", at: Date) {
  return OperationEntity.init({
    id: IdValueObject.getDefault(),
    type: OperationTypeValueObject.init({ value: type })
      .result as OperationTypeValueObject,
    funds: money(1_000n),
    createdAt: DateValueObject.init({ value: at }).result as DateValueObject,
  }).result as OperationEntity;
}

function wallet(
  overrides: {
    balance?: bigint;
    ops?: OperationEntity[];
    reserves?: ReserveEntity[];
  } = {},
) {
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId: UserIdValueObject.init({ value: USER_UUID })
      .result as UserIdValueObject,
    balance: money(overrides.balance ?? 50_000n),
    historic: overrides.ops ?? [],
    reserveds: overrides.reserves ?? [],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

describe("WalletResponseMapper", () => {
  const mapper = new WalletResponseMapper();

  it("maps the aggregate to the response DTO with cents-as-string", () => {
    const w = wallet({ balance: 49_500n });
    const dto = mapper.toRightSide(w);
    expect(dto.id).toBe(w.id.value);
    expect(dto.userId).toBe(USER_UUID);
    expect(dto.balanceCents).toBe("49500");
    expect(dto.availableCents).toBe("49500");
    expect(dto.reservedCents).toBe("0");
    expect(dto.operations).toEqual([]);
    expect(dto.reserves).toEqual([]);
    expect(typeof dto.createdAt).toBe("string");
    expect(typeof dto.updatedAt).toBe("string");
  });

  it("sorts operations newest-first by createdAt", () => {
    const older = operation("DEPOSIT", new Date("2024-01-01T00:00:00Z"));
    const newer = operation("WITHDRAW", new Date("2025-01-01T00:00:00Z"));
    const w = wallet({ ops: [older, newer] });

    const dto = mapper.toRightSide(w);
    expect(dto.operations.length).toBe(2);
    expect(dto.operations[0].type).toBe("WITHDRAW");
    expect(dto.operations[1].type).toBe("DEPOSIT");
  });

  it("reports reservedCents and availableCents correctly when reserves exist", () => {
    const reserve = ReserveEntity.init({
      id: IdValueObject.getDefault(),
      funds: money(2_000n),
      betId: IdValueObject.getDefault(),
      roundId: IdValueObject.getDefault(),
    }).result as ReserveEntity;

    const w = wallet({ balance: 10_000n, reserves: [reserve] });
    const dto = mapper.toRightSide(w);
    expect(dto.balanceCents).toBe("10000");
    expect(dto.reservedCents).toBe("2000");
    expect(dto.availableCents).toBe("8000");
    expect(dto.reserves.length).toBe(1);
    expect(dto.reserves[0].amountCents).toBe("2000");
    expect(dto.reserves[0].betId).toBe(reserve.betId.value);
    expect(dto.reserves[0].roundId).toBe(reserve.roundId.value);
  });

  it("emits createdAt/updatedAt as ISO-8601 strings", () => {
    const dto = mapper.toRightSide(wallet());
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.+Z$/);
    expect(dto.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.+Z$/);
  });

  it("serializes operation id and createdAt fields", () => {
    const op = operation("WIN", new Date("2025-06-15T12:00:00Z"));
    const w = wallet({ ops: [op] });
    const dto = mapper.toRightSide(w);
    expect(dto.operations[0].id).toBe(op.id.value);
    expect(dto.operations[0].type).toBe("WIN");
    expect(dto.operations[0].amountCents).toBe("1000");
    expect(dto.operations[0].createdAt).toBe("2025-06-15T12:00:00.000Z");
  });
});
