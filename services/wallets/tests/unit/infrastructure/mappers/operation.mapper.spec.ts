import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { OperationEntity } from "../../../../src/domain/entities/operation/operation.entity";
import { OperationTypeValueObject } from "../../../../src/domain/value-objects/operation-type/operation-type.value-object";
import { OperationMapper } from "../../../../src/infrastructure/database/mappers/operation.mapper";
import type { IOperationSchema } from "../../../../src/infrastructure/database/schema/wallet.schema";

describe("OperationMapper", () => {
  const mapper = new OperationMapper();
  const id = IdValueObject.getDefault();
  const funds = MoneyValueObject.init({ value: 1_234n })
    .result as MoneyValueObject;
  const createdAt = new Date("2025-01-01T00:00:00.000Z");

  describe("toRightSide (schema → entity)", () => {
    it("builds an OperationEntity from every allowed type", () => {
      for (const type of ["DEPOSIT", "WITHDRAW", "RESERVE", "LOST", "WIN"] as const) {
        const schema: IOperationSchema = {
          id: id.value,
          walletId: IdValueObject.getDefault().value,
          type,
          funds: 500n,
          createdAt,
        };
        const entity = mapper.toRightSide(schema);
        expect(entity.id.value).toBe(schema.id);
        expect(entity.type.value).toBe(type);
        expect(entity.funds.cents).toBe(500n);
        expect(entity.createdAt.value.toISOString()).toBe(createdAt.toISOString());
      }
    });
  });

  describe("toLeftSide (entity → schema)", () => {
    it("maps entity fields back and leaves walletId empty (filled by wallet mapper)", () => {
      const entity = OperationEntity.init({
        id,
        type: OperationTypeValueObject.deposit(),
        funds,
        createdAt: DateValueObject.init({ value: createdAt })
          .result as DateValueObject,
      }).result as OperationEntity;

      const schema = mapper.toLeftSide(entity);
      expect(schema.id).toBe(id.value);
      expect(schema.walletId).toBe("");
      expect(schema.type).toBe("DEPOSIT");
      expect(schema.funds).toBe(1_234n);
      expect(schema.createdAt).toEqual(createdAt);
    });
  });

  describe("round-trip", () => {
    it("schema → entity → schema preserves scalar values (walletId aside)", () => {
      const schema: IOperationSchema = {
        id: id.value,
        walletId: "somewalletid1234",
        type: "WITHDRAW",
        funds: 999n,
        createdAt,
      };

      const entity = mapper.toRightSide(schema);
      const back = mapper.toLeftSide(entity);

      expect(back.id).toBe(schema.id);
      expect(back.type).toBe(schema.type);
      expect(back.funds).toBe(schema.funds);
      expect(back.createdAt).toEqual(schema.createdAt);
      // walletId intentionally stripped — the WalletMapper re-attaches it.
      expect(back.walletId).toBe("");
    });
  });
});
