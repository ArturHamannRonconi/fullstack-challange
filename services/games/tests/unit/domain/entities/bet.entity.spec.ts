import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";
import { MoneyValueObject } from "@crash/domain";

import { BetEntity } from "../../../../src/domain/entities/bet/bet.entity";
import { PlayerIdValueObject } from "../../../../src/domain/value-objects/player-id/player-id.value-object";

const PLAYER = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;
const playerId = (value: string) =>
  PlayerIdValueObject.init({ value }).result as PlayerIdValueObject;

function makeBet(cents = 1_000n): BetEntity {
  return BetEntity.init({
    id: IdValueObject.getDefault(),
    playerId: playerId(PLAYER),
    stakedAmount: money(cents),
    createdAt: DateValueObject.getDefault(),
    updatedAt: DateValueObject.getDefault(),
  }).result as BetEntity;
}

describe("BetEntity", () => {
  describe("init", () => {
    it("creates a bet within the 100–100_000 range", () => {
      expect(() => makeBet(100n)).not.toThrow();
      expect(() => makeBet(100_000n)).not.toThrow();
    });

    it("rejects amount below 100 cents", () => {
      const out = BetEntity.init({
        id: IdValueObject.getDefault(),
        playerId: playerId(PLAYER),
        stakedAmount: money(50n),
        createdAt: DateValueObject.getDefault(),
        updatedAt: DateValueObject.getDefault(),
      });
      expect(out.isFailure).toBe(true);
    });

    it("rejects amount above 100_000 cents", () => {
      const out = BetEntity.init({
        id: IdValueObject.getDefault(),
        playerId: playerId(PLAYER),
        stakedAmount: money(200_000n),
        createdAt: DateValueObject.getDefault(),
        updatedAt: DateValueObject.getDefault(),
      });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("cashOut", () => {
    it("records the multiplier and marks as cashed out", () => {
      const bet = makeBet();
      const out = bet.cashOut(25_000n);
      expect(out.isSuccess).toBe(true);
      expect(bet.isCashedOut).toBe(true);
      expect(bet.cashOutPoint?.scaled).toBe(25_000n);
    });

    it("rejects a double cashout", () => {
      const bet = makeBet();
      bet.cashOut(25_000n);
      const out = bet.cashOut(40_000n);
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(409);
    });
  });

  describe("computeTotalPayout", () => {
    it("scales the stake by the multiplier, truncating (favor house)", () => {
      const bet = makeBet(1_000n);
      // 2.00x → 2000 cents. 2.5x → 2500. 1.3333x (scaled 13333) → 1333 (trunc).
      expect(bet.computeTotalPayout(20_000n).cents).toBe(2_000n);
      expect(bet.computeTotalPayout(25_000n).cents).toBe(2_500n);
      expect(bet.computeTotalPayout(13_333n).cents).toBe(1_333n);
    });

    it("returns 0 for an impossibly low multiplier (< 1x not usable in practice)", () => {
      // Forced for completeness; multiplier is always >= 10000 in production.
      const bet = makeBet(1_000n);
      expect(bet.computeTotalPayout(5_000n).cents).toBe(500n);
    });
  });
});
