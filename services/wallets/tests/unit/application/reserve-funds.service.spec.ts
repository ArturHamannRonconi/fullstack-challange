import { describe, expect, it, mock } from "bun:test";
import { DateValueObject, IdValueObject, Output } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";
import type { IRealTimeDb } from "@crash/real-time-db";

import { OperationEntity } from "../../../src/domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../src/domain/wallet.aggregate-root";
import { ReserveFundsService } from "../../../src/application/services/reserve-funds/reserve-funds.service";
import type { WalletRepository } from "../../../src/infrastructure/database/repositories/wallet.repository";
import { WalletBalanceStore } from "../../../src/infrastructure/nosql/wallet-balance.store";

const USER_ID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";
const ROUND_ID = IdValueObject.getDefault().value;
const BET_ID = IdValueObject.getDefault().value;

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

function buildWallet(initialCents = 50_000n): WalletAggregateRoot {
  const userId = UserIdValueObject.init({ value: USER_ID })
    .result as UserIdValueObject;
  const deposit = OperationEntity.init({
    type: OperationTypeValueObject.deposit(),
    funds: money(initialCents),
    createdAt: DateValueObject.getDefault(),
  }).result as OperationEntity;
  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId,
    balance: money(initialCents),
    reserveds: [],
    historic: [deposit],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

function makeRepo(overrides: Partial<WalletRepository> = {}): WalletRepository {
  return {
    save: mock(async () => {}),
    findById: mock(async () => null),
    findByUserId: mock(async () => null),
    findAllWithReservesForRound: mock(async () => []),
    ...overrides,
  };
}

function makeDb(): IRealTimeDb {
  return {
    get: mock(async () => null),
    set: mock(async () => {}),
    del: mock(async () => {}),
    exists: mock(async () => false),
  };
}

describe("ReserveFundsService", () => {
  it("returns 404 when wallet is not found", async () => {
    const service = new ReserveFundsService(makeRepo(), new WalletBalanceStore(makeDb()));
    const out = await service.execute({
      messageId: "m1",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("reserves funds and persists the wallet", async () => {
    const wallet = buildWallet();
    const save = mock(async () => {});
    const repo = makeRepo({ findByUserId: mock(async () => wallet), save });
    const db = makeDb();
    const service = new ReserveFundsService(repo, new WalletBalanceStore(db));

    const out = await service.execute({
      messageId: "m1",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      amountCents: "1000",
    });

    expect(out.isSuccess).toBe(true);
    const reserveId = (out.result as { reserveId: string }).reserveId;
    expect(reserveId).toBeDefined();
    expect(save).toHaveBeenCalledTimes(1);
    expect(db.set).toHaveBeenCalled();
    expect(wallet.reserveds).toHaveLength(1);
    expect(wallet.reserveds[0].funds.cents).toBe(1_000n);
  });

  it("is idempotent per betId (second call returns the same reserve without re-adding)", async () => {
    const wallet = buildWallet();
    const reserveOut = wallet.reserveFunds(
      IdValueObject.init({ value: ROUND_ID }).result as IdValueObject,
      IdValueObject.init({ value: BET_ID }).result as IdValueObject,
      money(1_000n),
    );
    expect(reserveOut.isSuccess).toBe(true);
    const existingReserveId = wallet.reserveds[0].id.value;
    const save = mock(async () => {});
    const repo = makeRepo({ findByUserId: mock(async () => wallet), save });
    const service = new ReserveFundsService(repo, new WalletBalanceStore(makeDb()));

    const out = await service.execute({
      messageId: "m2",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      amountCents: "1000",
    });

    expect(out.isSuccess).toBe(true);
    expect((out.result as { reserveId: string }).reserveId).toBe(existingReserveId);
    expect(save).not.toHaveBeenCalled();
    expect(wallet.reserveds).toHaveLength(1);
  });

  it("returns 422 when amount exceeds available funds", async () => {
    const wallet = buildWallet(500n);
    const repo = makeRepo({ findByUserId: mock(async () => wallet) });
    const service = new ReserveFundsService(repo, new WalletBalanceStore(makeDb()));
    const out = await service.execute({
      messageId: "m3",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
  });

  it("propagates 500 when repository throws", async () => {
    const repo = makeRepo({
      findByUserId: mock(async () => {
        throw new Error("db down");
      }),
    });
    const service = new ReserveFundsService(repo, new WalletBalanceStore(makeDb()));
    const out = await service.execute({
      messageId: "m4",
      userId: USER_ID,
      roundId: ROUND_ID,
      betId: BET_ID,
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
