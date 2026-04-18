import { describe, expect, it, mock } from "bun:test";
import type { IRealTimeDb } from "@crash/real-time-db";

import { StartGameService } from "../../../src/application/services/start-game/start-game.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";
import { RoundStateStore } from "../../../src/infrastructure/nosql/round-state.store";
import { buildRound } from "../../integration/controllers/helpers/round-factory";

function makeDb(): IRealTimeDb {
  return {
    get: mock(async () => null),
    set: mock(async () => {}),
    del: mock(async () => {}),
    exists: mock(async () => false),
  };
}

function makeRepo(overrides: Partial<RoundRepository> = {}): RoundRepository {
  return {
    save: mock(async () => {}),
    findById: mock(async () => null),
    findCurrent: mock(async () => null),
    findHistory: mock(async () => ({ items: [], total: 0 })),
    findBetsByPlayer: mock(async () => ({ items: [], total: 0 })),
    findLeaderboard: mock(async () => ({ items: [], total: 0 })),
    ...overrides,
  };
}

describe("StartGameService", () => {
  it("returns 404 when round is not found", async () => {
    const service = new StartGameService(makeRepo(), new RoundStateStore(makeDb()));
    const out = await service.execute({
      roundId: "0".repeat(16),
      startedAtMs: Date.now(),
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("transitions BETTING_OPEN → BETTING_CLOSED → ROUND_START on first call", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    const save = mock(async () => {});
    const repo = makeRepo({
      findById: mock(async () => round),
      save,
    });
    const db = makeDb();
    const service = new StartGameService(repo, new RoundStateStore(db));

    const out = await service.execute({
      roundId: round.id.value,
      startedAtMs: 1_700_000_000_000,
    });
    expect(out.isSuccess).toBe(true);
    const statuses = round.roundStatus.map((s) => s.status.value);
    expect(statuses).toEqual(["BETTING_OPEN", "BETTING_CLOSED", "ROUND_START"]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(db.set).toHaveBeenCalled();
  });

  it("is idempotent when the round is already RUNNING", async () => {
    const round = buildRound({ status: "ROUND_START" });
    const save = mock(async () => {});
    const repo = makeRepo({ findById: mock(async () => round), save });
    const service = new StartGameService(repo, new RoundStateStore(makeDb()));

    const out = await service.execute({
      roundId: round.id.value,
      startedAtMs: Date.now(),
    });
    expect(out.isSuccess).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it("is idempotent when the round is already CRASHED", async () => {
    const round = buildRound({ status: "CRASHED" });
    const save = mock(async () => {});
    const repo = makeRepo({ findById: mock(async () => round), save });
    const service = new StartGameService(repo, new RoundStateStore(makeDb()));

    const out = await service.execute({
      roundId: round.id.value,
      startedAtMs: Date.now(),
    });
    expect(out.isSuccess).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
});
