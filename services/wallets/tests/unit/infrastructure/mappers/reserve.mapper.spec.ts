import { describe, expect, it } from "bun:test";
import { IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { ReserveEntity } from "../../../../src/domain/entities/reserve/reserve.entity";
import { ReserveMapper } from "../../../../src/infrastructure/database/mappers/reserve.mapper";
import { IReserveSchema } from "../../../../src/infrastructure/database/schema/wallet.schema";

describe("ReserveMapper", () => {
  const mapper = new ReserveMapper();
  const id = IdValueObject.getDefault();
  const betId = IdValueObject.getDefault();
  const roundId = IdValueObject.getDefault();

  describe("toRightSide (schema → entity)", () => {
    it("builds a ReserveEntity from a schema row", () => {
      const schema: IReserveSchema = {
        id: id.value,
        walletId: IdValueObject.getDefault().value,
        funds: 7_500n,
        betId: betId.value,
        roundId: roundId.value,
        createdAt: new Date("2025-02-02T12:00:00.000Z"),
      };
      const entity = mapper.toRightSide(schema);
      expect(entity.id.value).toBe(schema.id);
      expect(entity.funds.cents).toBe(7_500n);
      expect(entity.betId.value).toBe(schema.betId);
      expect(entity.roundId.value).toBe(schema.roundId);
    });
  });

  describe("toLeftSide (entity → schema)", () => {
    it("maps entity back and clears walletId, sets createdAt to now", () => {
      const entity = ReserveEntity.init({
        id,
        funds: MoneyValueObject.init({ value: 7_500n })
          .result as MoneyValueObject,
        betId,
        roundId,
      }).result as ReserveEntity;

      const before = Date.now();
      const schema = mapper.toLeftSide(entity);
      const after = Date.now();

      expect(schema.id).toBe(id.value);
      expect(schema.walletId).toBe("");
      expect(schema.funds).toBe(7_500n);
      expect(schema.betId).toBe(betId.value);
      expect(schema.roundId).toBe(roundId.value);
      expect(schema.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(schema.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("round-trip", () => {
    it("schema → entity → schema preserves id/funds/betId/roundId", () => {
      const schema: IReserveSchema = {
        id: id.value,
        walletId: "w0123456789abcde",
        funds: 250n,
        betId: betId.value,
        roundId: roundId.value,
        createdAt: new Date("2024-06-01T00:00:00.000Z"),
      };
      const back = mapper.toLeftSide(mapper.toRightSide(schema));
      expect(back.id).toBe(schema.id);
      expect(back.funds).toBe(schema.funds);
      expect(back.betId).toBe(schema.betId);
      expect(back.roundId).toBe(schema.roundId);
      // createdAt intentionally replaced with Date.now() by the mapper.
      expect(back.walletId).toBe("");
    });
  });
});
