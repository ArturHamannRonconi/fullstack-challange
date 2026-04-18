import { describe, expect, it, mock } from "bun:test";
import type { IRealTimeDb } from "@crash/real-time-db";

import { ProcessCrashService } from "../../../src/application/services/process-crash/process-crash.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";
import { RoundStateStore } from "../../../src/infrastructure/nosql/round-state.store";
import { buildRound, makeBet } from "../../integration/controllers/helpers/round-factory";

const PLAYER = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

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

describe("ProcessCrashService", () => {
  it("returns 404 when the round is not found", async () => {
    const service = new ProcessCrashService(makeRepo(), new RoundStateStore(makeDb()));
    const out = await service.execute({ roundId: "0".repeat(16) });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("transitions a running round into CRASHED and clears round state", async () => {
    const round = buildRound({ status: "ROUND_START" });
    round.bets.push(makeBet(PLAYER));
    const save = mock(async () => {});
    const del = mock(async () => {});
    const db: IRealTimeDb = { ...makeDb(), del };
    const repo = makeRepo({ findById: mock(async () => round), save });
    const service = new ProcessCrashService(repo, new RoundStateStore(db));

    const out = await service.execute({ roundId: round.id.value });

    expect(out.isSuccess).toBe(true);
    expect(round.isCrashed).toBe(true);
    const body = out.result as { losingBetsCount: number };
    // Player never cashed out → counted as a losing bet.
    expect(body.losingBetsCount).toBe(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("is idempotent for an already-crashed round (no extra save, counts losing bets)", async () => {
    const round = buildRound({ status: "CRASHED" });
    round.bets.push(makeBet(PLAYER));
    const save = mock(async () => {});
    const repo = makeRepo({ findById: mock(async () => round), save });
    const service = new ProcessCrashService(repo, new RoundStateStore(makeDb()));

    const out = await service.execute({ roundId: round.id.value });
    expect(out.isSuccess).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect((out.result as { losingBetsCount: number }).losingBetsCount).toBe(1);
  });
});
