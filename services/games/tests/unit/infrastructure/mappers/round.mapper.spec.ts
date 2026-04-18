import { describe, expect, it } from "bun:test";
import { DateValueObject, IdValueObject } from "ddd-tool-kit";

import { BetMapper } from "../../../../src/infrastructure/database/mappers/bet.mapper";
import { RoundMapper } from "../../../../src/infrastructure/database/mappers/round.mapper";
import { RoundStatusMapper } from "../../../../src/infrastructure/database/mappers/round-status.mapper";
import type { IRoundSchema } from "../../../../src/infrastructure/database/schema/round.schema";
import { buildRound, makeBet } from "../../../integration/controllers/helpers/round-factory";

function mapper(): RoundMapper {
  return new RoundMapper(new BetMapper(), new RoundStatusMapper());
}

function baseSchema(overrides: Partial<IRoundSchema> = {}): IRoundSchema {
  const id = IdValueObject.getDefault().value;
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    serverSeed: "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11",
    seedHash: "a".repeat(64),
    crashPointScaled: 552,
    startedAt: null,
    createdAt: now,
    updatedAt: now,
    bets: [],
    statusHistory: [
      {
        id: IdValueObject.getDefault().value,
        roundId: id,
        status: "BETTING_OPEN",
        statusDate: now,
      },
    ],
    ...overrides,
  };
}

describe("RoundMapper", () => {
  describe("toRightSide (schema → aggregate)", () => {
    it("reconstructs the aggregate with seed, crashPoint, and status history", () => {
      const round = mapper().toRightSide(baseSchema());
      expect(round.seed.value).toBe("f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11");
      expect(round.crashPointScaled).toBe(552);
      expect(round.currentStatus?.value).toBe("BETTING_OPEN");
      expect(round.bets).toHaveLength(0);
    });

    it("maps startedAt when present", () => {
      const now = new Date("2026-06-01T12:00:00.000Z");
      const schema = baseSchema({ startedAt: now });
      const round = mapper().toRightSide(schema);
      expect(round.startedAt?.value.getTime()).toBe(now.getTime());
    });

    it("leaves startedAt undefined when null in schema", () => {
      const round = mapper().toRightSide(baseSchema({ startedAt: null }));
      expect(round.startedAt).toBeUndefined();
    });

    it("rehydrates bets inside the aggregate", () => {
      const id = IdValueObject.getDefault().value;
      const betRow = {
        id: IdValueObject.getDefault().value,
        roundId: id,
        playerId: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
        username: "alice",
        stakedAmount: 1_000n,
        cashOutPointScaled: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      };
      const round = mapper().toRightSide(baseSchema({ id, bets: [betRow] }));
      expect(round.bets).toHaveLength(1);
      expect(round.bets[0].stakedAmount.cents).toBe(1_000n);
    });
  });

  describe("toLeftSide (aggregate → schema)", () => {
    it("includes seedHash computed from the server seed", () => {
      const round = buildRound({ status: "CRASHED" });
      const row = mapper().toLeftSide(round);
      expect(row.seedHash).toBe(round.seed.hash);
      expect(row.serverSeed).toBe(round.seed.value);
      expect(row.crashPointScaled).toBe(round.crashPointScaled);
    });

    it("fills child rows with the round id", () => {
      const round = buildRound({ status: "BETTING_OPEN" });
      round.bets.push(makeBet("3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42"));
      const row = mapper().toLeftSide(round);
      expect(row.bets.every((b) => b.roundId === round.id.value)).toBe(true);
      expect(row.statusHistory.every((s) => s.roundId === round.id.value)).toBe(true);
    });

    it("writes startedAt as Date | null", () => {
      const open = buildRound({ status: "BETTING_OPEN" });
      expect(mapper().toLeftSide(open).startedAt).toBeNull();

      const running = buildRound({ status: "ROUND_START" });
      const rowRunning = mapper().toLeftSide(running);
      expect(rowRunning.startedAt).toBeInstanceOf(Date);
    });
  });

  describe("round-trip", () => {
    it("preserves identity through (aggregate → schema → aggregate)", () => {
      const original = buildRound({ status: "CRASHED" });
      const row = mapper().toLeftSide(original);
      const rehydrated = mapper().toRightSide({
        ...row,
        bets: row.bets,
        statusHistory: row.statusHistory,
      });
      expect(rehydrated.id.value).toBe(original.id.value);
      expect(rehydrated.seed.value).toBe(original.seed.value);
      expect(rehydrated.crashPointScaled).toBe(original.crashPointScaled);
      expect(rehydrated.currentStatus?.value).toBe(original.currentStatus?.value);
      expect(rehydrated.createdAt).toBeInstanceOf(DateValueObject);
    });
  });
});
