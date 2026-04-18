import { describe, expect, it } from "bun:test";
import { MoneyValueObject } from "@crash/domain";

import { RoundAggregateRoot } from "../../../src/domain/round.aggregate-root";
import { PlayerIdValueObject } from "../../../src/domain/value-objects/player-id/player-id.value-object";

const PLAYER_A = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";
const PLAYER_B = "7ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

const playerId = (value: string) =>
  PlayerIdValueObject.init({ value }).result as PlayerIdValueObject;
const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

function newRound() {
  const out = RoundAggregateRoot.create();
  expect(out.isSuccess).toBe(true);
  return out.result as RoundAggregateRoot;
}

describe("RoundAggregateRoot", () => {
  describe("create", () => {
    it("starts in BETTING_OPEN with a fresh seed and deterministic crashPoint", () => {
      const round = newRound();
      expect(round.isBettingOpen).toBe(true);
      expect(round.seed.value.length).toBeGreaterThan(0);
      expect(round.crashPointScaled).toBeGreaterThanOrEqual(100);
      expect(round.seed.hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("placeBet", () => {
    it("accepts the first bet from a player in BETTING_OPEN", () => {
      const round = newRound();
      const out = round.placeBet({
        playerId: playerId(PLAYER_A),
        stakedAmount: money(1_000n),
      });
      expect(out.isSuccess).toBe(true);
      expect(round.bets.length).toBe(1);
    });

    it("rejects a second bet from the same player", () => {
      const round = newRound();
      round.placeBet({ playerId: playerId(PLAYER_A), stakedAmount: money(1_000n) });
      const out = round.placeBet({
        playerId: playerId(PLAYER_A),
        stakedAmount: money(2_000n),
      });
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(409);
      expect(round.bets.length).toBe(1);
    });

    it("accepts bets from different players", () => {
      const round = newRound();
      round.placeBet({ playerId: playerId(PLAYER_A), stakedAmount: money(1_000n) });
      round.placeBet({ playerId: playerId(PLAYER_B), stakedAmount: money(1_500n) });
      expect(round.bets.length).toBe(2);
    });

    it("rejects bets after transitioning out of BETTING_OPEN", () => {
      const round = newRound();
      round.startRunning(Date.now());
      const out = round.placeBet({
        playerId: playerId(PLAYER_A),
        stakedAmount: money(1_000n),
      });
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(422);
    });

    it("rejects bet below 100 cents", () => {
      const round = newRound();
      const out = round.placeBet({
        playerId: playerId(PLAYER_A),
        stakedAmount: money(50n),
      });
      expect(out.isFailure).toBe(true);
    });

    it("rejects bet above 100_000 cents", () => {
      const round = newRound();
      const out = round.placeBet({
        playerId: playerId(PLAYER_A),
        stakedAmount: money(200_000n),
      });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("cashOutBetFor", () => {
    it("rejects cashout when round is not RUNNING", () => {
      const round = newRound();
      round.placeBet({ playerId: playerId(PLAYER_A), stakedAmount: money(1_000n) });
      const out = round.cashOutBetFor(playerId(PLAYER_A), 20_000n);
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(422);
    });

    it("cashes out during RUNNING and freezes the multiplier on the bet", () => {
      const round = newRound();
      round.placeBet({ playerId: playerId(PLAYER_A), stakedAmount: money(1_000n) });
      round.startRunning(Date.now());
      const out = round.cashOutBetFor(playerId(PLAYER_A), 25_000n);
      expect(out.isSuccess).toBe(true);
      const bet = round.findBetByPlayer(playerId(PLAYER_A));
      expect(bet?.isCashedOut).toBe(true);
      expect(bet?.cashOutPoint?.scaled).toBe(25_000n);
    });

    it("rejects cashout for a player without a bet", () => {
      const round = newRound();
      round.startRunning(Date.now());
      const out = round.cashOutBetFor(playerId(PLAYER_A), 20_000n);
      expect(out.isFailure).toBe(true);
      expect((out.result as { statusCode: number }).statusCode).toBe(404);
    });
  });

  describe("state transitions", () => {
    it("transitions BETTING_OPEN → BETTING_CLOSED → ROUND_START → CRASHED", () => {
      const round = newRound();
      expect(round.currentStatus?.value).toBe("BETTING_OPEN");

      round.closeBetting();
      expect(round.currentStatus?.value).toBe("BETTING_CLOSED");

      round.startRunning(Date.now());
      expect(round.currentStatus?.value).toBe("ROUND_START");
      expect(round.isRunning).toBe(true);

      round.crash();
      expect(round.currentStatus?.value).toBe("CRASHED");
      expect(round.isCrashed).toBe(true);
    });

    it("rejects double-crash", () => {
      const round = newRound();
      round.startRunning(Date.now());
      round.crash();
      const out = round.crash();
      expect(out.isFailure).toBe(true);
    });
  });
});
