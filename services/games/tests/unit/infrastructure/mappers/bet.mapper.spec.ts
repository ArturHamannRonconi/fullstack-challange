import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { BetEntity } from "../../../../src/domain/entities/bet/bet.entity";
import { CashOutPointValueObject } from "../../../../src/domain/value-objects/cash-out-point/cash-out-point.value-object";
import { PlayerIdValueObject } from "../../../../src/domain/value-objects/player-id/player-id.value-object";
import { BetMapper } from "../../../../src/infrastructure/database/mappers/bet.mapper";
import type { IBetSchema } from "../../../../src/infrastructure/database/schema/round.schema";

const PLAYER_ID = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

function schema(overrides: Partial<IBetSchema> = {}): IBetSchema {
  return {
    id: IdValueObject.getDefault().value,
    roundId: IdValueObject.getDefault().value,
    playerId: PLAYER_ID,
    username: "alice",
    stakedAmount: 1_000n,
    cashOutPointScaled: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

describe("BetMapper", () => {
  const mapper = new BetMapper();

  describe("toRightSide (schema → entity)", () => {
    it("maps a bet row without cashout", () => {
      const entity = mapper.toRightSide(schema());
      expect(entity.playerId.value).toBe(PLAYER_ID);
      expect(entity.stakedAmount.cents).toBe(1_000n);
      expect(entity.username).toBe("alice");
      expect(entity.isCashedOut).toBe(false);
      expect(entity.cashOutPoint).toBeUndefined();
    });

    it("maps a bet row with cashOutPointScaled into CashOutPointValueObject", () => {
      const entity = mapper.toRightSide(schema({ cashOutPointScaled: 25_000n }));
      expect(entity.isCashedOut).toBe(true);
      expect(entity.cashOutPoint).toBeInstanceOf(CashOutPointValueObject);
      expect(entity.cashOutPoint?.scaled).toBe(25_000n);
    });

    it("treats null username as undefined on the entity", () => {
      const entity = mapper.toRightSide(schema({ username: null }));
      expect(entity.username).toBeUndefined();
    });
  });

  describe("toLeftSide (entity → schema)", () => {
    it("leaves roundId blank (the round mapper fills it)", () => {
      const entity = BetEntity.init({
        id: IdValueObject.getDefault(),
        playerId: PlayerIdValueObject.init({ value: PLAYER_ID })
          .result as PlayerIdValueObject,
        stakedAmount: MoneyValueObject.init({ value: 1_000n })
          .result as MoneyValueObject,
      }).result as BetEntity;

      const row = mapper.toLeftSide(entity);
      expect(row.roundId).toBe("");
      expect(row.stakedAmount).toBe(1_000n);
      expect(row.cashOutPointScaled).toBeNull();
    });

    it("round-trips a cashed-out entity back to schema", () => {
      const entity = mapper.toRightSide(
        schema({ cashOutPointScaled: 30_000n, username: "bob" }),
      );
      const row = mapper.toLeftSide(entity);
      expect(row.cashOutPointScaled).toBe(30_000n);
      expect(row.username).toBe("bob");
      expect(row.playerId).toBe(PLAYER_ID);
    });

    it("maps null username back to null", () => {
      const entity = mapper.toRightSide(schema({ username: null }));
      const row = mapper.toLeftSide(entity);
      expect(row.username).toBeNull();
    });
  });

  describe("round-trip", () => {
    it("preserves stakedAmount bigint precision through (schema → entity → schema)", () => {
      // BetEntity.init enforces MIN_BET_CENTS..MAX_BET_CENTS, and CashOutPoint
      // VO requires value >= MULTIPLIER_SCALE (10_000). Use the upper bound
      // stake plus the minimum valid cashout to exercise a round-trip.
      const original = schema({
        stakedAmount: 99_999n,
        cashOutPointScaled: 10_000n,
      });
      const roundTripped = mapper.toLeftSide(mapper.toRightSide(original));
      expect(roundTripped.stakedAmount).toBe(99_999n);
      expect(roundTripped.cashOutPointScaled).toBe(10_000n);
    });
  });

  describe("DateValueObject handling", () => {
    it("preserves createdAt and updatedAt across the round trip", () => {
      const entity = mapper.toRightSide(schema());
      expect(entity.createdAt).toBeInstanceOf(DateValueObject);
      expect(entity.updatedAt).toBeInstanceOf(DateValueObject);
      const back = mapper.toLeftSide(entity);
      expect(back.createdAt.getTime()).toBe(CREATED_AT.getTime());
    });
  });
});
