import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../../src/domain/entities/operation/operation.entity";
import { ReserveEntity } from "../../../../src/domain/entities/reserve/reserve.entity";
import { OperationTypeValueObject } from "../../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { UserIdValueObject } from "../../../../src/domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../../src/domain/wallet.aggregate-root";
import { OperationMapper } from "../../../../src/infrastructure/database/mappers/operation.mapper";
import { ReserveMapper } from "../../../../src/infrastructure/database/mappers/reserve.mapper";
import { WalletMapper } from "../../../../src/infrastructure/database/mappers/wallet.mapper";
import type { IWalletSchema } from "../../../../src/infrastructure/database/schema/wallet.schema";

const USER_UUID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

function buildMapper() {
  return new WalletMapper(new OperationMapper(), new ReserveMapper());
}

function buildAggregate() {
  const userId = UserIdValueObject.init({ value: USER_UUID })
    .result as UserIdValueObject;
  const balance = MoneyValueObject.init({ value: 49_500n })
    .result as MoneyValueObject;

  const op = OperationEntity.init({
    id: IdValueObject.getDefault(),
    type: OperationTypeValueObject.deposit(),
    funds: MoneyValueObject.init({ value: 50_000n }).result as MoneyValueObject,
    createdAt: DateValueObject.getDefault(),
  }).result as OperationEntity;

  const reserve = ReserveEntity.init({
    id: IdValueObject.getDefault(),
    funds: MoneyValueObject.init({ value: 500n }).result as MoneyValueObject,
    betId: IdValueObject.getDefault(),
    roundId: IdValueObject.getDefault(),
  }).result as ReserveEntity;

  return WalletAggregateRoot.init({
    id: IdValueObject.getDefault(),
    userId,
    balance,
    reserveds: [reserve],
    historic: [op],
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as WalletAggregateRoot;
}

describe("WalletMapper", () => {
  describe("toRightSide (schema → aggregate)", () => {
    it("hydrates a WalletAggregateRoot with operations and reserves", () => {
      const mapper = buildMapper();
      const walletId = IdValueObject.getDefault().value;
      const createdAt = new Date("2025-01-01T00:00:00.000Z");
      const updatedAt = new Date("2025-01-02T00:00:00.000Z");

      const schema: IWalletSchema = {
        id: walletId,
        userId: USER_UUID,
        balance: 49_500n,
        createdAt,
        updatedAt,
        operations: [
          {
            id: IdValueObject.getDefault().value,
            walletId,
            type: "DEPOSIT",
            funds: 50_000n,
            createdAt,
          },
        ],
        reserves: [
          {
            id: IdValueObject.getDefault().value,
            walletId,
            funds: 500n,
            betId: IdValueObject.getDefault().value,
            roundId: IdValueObject.getDefault().value,
            createdAt,
          },
        ],
      };

      const aggregate = mapper.toRightSide(schema);
      expect(aggregate.id.value).toBe(walletId);
      expect(aggregate.userId.value).toBe(USER_UUID);
      expect(aggregate.balance.cents).toBe(49_500n);
      expect(aggregate.historic.length).toBe(1);
      expect(aggregate.historic[0].type.value).toBe("DEPOSIT");
      expect(aggregate.reserveds.length).toBe(1);
      expect(aggregate.reserveds[0].funds.cents).toBe(500n);
      expect(aggregate.createdAt.value.getTime()).toBe(createdAt.getTime());
      expect(aggregate.updatedAt.value.getTime()).toBe(updatedAt.getTime());
    });

    it("hydrates empty operations/reserves as empty arrays", () => {
      const mapper = buildMapper();
      const walletId = IdValueObject.getDefault().value;
      const schema: IWalletSchema = {
        id: walletId,
        userId: USER_UUID,
        balance: 0n,
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
        reserves: [],
      };
      const aggregate = mapper.toRightSide(schema);
      expect(aggregate.historic).toEqual([]);
      expect(aggregate.reserveds).toEqual([]);
    });
  });

  describe("toLeftSide (aggregate → schema)", () => {
    it("stamps walletId on each operation and reserve", () => {
      const mapper = buildMapper();
      const aggregate = buildAggregate();

      const schema = mapper.toLeftSide(aggregate);
      expect(schema.id).toBe(aggregate.id.value);
      expect(schema.userId).toBe(USER_UUID);
      expect(schema.balance).toBe(49_500n);
      expect(schema.operations.length).toBe(1);
      expect(schema.operations[0].walletId).toBe(aggregate.id.value);
      expect(schema.reserves.length).toBe(1);
      expect(schema.reserves[0].walletId).toBe(aggregate.id.value);
    });
  });

  describe("round-trip", () => {
    it("aggregate → schema → aggregate preserves the primary state", () => {
      const mapper = buildMapper();
      const original = buildAggregate();
      const schema = mapper.toLeftSide(original);
      const hydrated = mapper.toRightSide(schema);

      expect(hydrated.id.value).toBe(original.id.value);
      expect(hydrated.userId.value).toBe(original.userId.value);
      expect(hydrated.balance.cents).toBe(original.balance.cents);
      expect(hydrated.historic.length).toBe(original.historic.length);
      expect(hydrated.historic[0].type.value).toBe(
        original.historic[0].type.value,
      );
      expect(hydrated.reserveds.length).toBe(original.reserveds.length);
      expect(hydrated.reserveds[0].funds.cents).toBe(
        original.reserveds[0].funds.cents,
      );
    });
  });
});
