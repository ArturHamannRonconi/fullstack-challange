import { describe, expect, it, mock } from "bun:test";

import { VerifyRoundService } from "../../../src/application/services/verify-round/verify-round.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";
import { buildRound } from "../../integration/controllers/helpers/round-factory";

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

describe("VerifyRoundService", () => {
  it("rejects an invalid roundId with a validation failure", async () => {
    const repo = makeRepo();
    const service = new VerifyRoundService(repo);
    const out = await service.execute({ roundId: "" });
    expect(out.isFailure).toBe(true);
  });

  it("returns 404 when the round does not exist", async () => {
    const repo = makeRepo({ findById: mock(async () => null) });
    const service = new VerifyRoundService(repo);
    const out = await service.execute({ roundId: "0".repeat(16) });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("returns 409 when the round has not crashed yet (seed not revealed)", async () => {
    const round = buildRound({ status: "ROUND_START" });
    const repo = makeRepo({ findById: mock(async () => round) });
    const service = new VerifyRoundService(repo);
    const out = await service.execute({ roundId: round.id.value });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(409);
  });

  it("returns verification payload for a crashed round", async () => {
    const round = buildRound({ status: "CRASHED" });
    const repo = makeRepo({ findById: mock(async () => round) });
    const service = new VerifyRoundService(repo);

    const out = await service.execute({ roundId: round.id.value });

    expect(out.isSuccess).toBe(true);
    const body = out.result as {
      roundId: string;
      serverSeed: string;
      seedHash: string;
      crashPointScaled: number;
      isValid: boolean;
    };
    expect(body.roundId).toBe(round.id.value);
    expect(body.serverSeed).toBe(round.seed.value);
    expect(body.seedHash).toBe(round.seed.hash);
    expect(body.crashPointScaled).toBe(round.crashPointScaled);
    expect(body.isValid).toBe(true);
  });
});
