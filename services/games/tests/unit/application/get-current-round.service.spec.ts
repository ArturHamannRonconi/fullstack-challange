import { describe, expect, it, mock } from "bun:test";

import { GetCurrentRoundService } from "../../../src/application/services/get-current-round/get-current-round.service";
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

describe("GetCurrentRoundService", () => {
  it("returns { round: null } when no round exists", async () => {
    const service = new GetCurrentRoundService(makeRepo());
    const out = await service.execute({});
    expect(out.isSuccess).toBe(true);
    expect((out.result as { round: unknown }).round).toBeNull();
  });

  it("returns the current round from the repository", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    const service = new GetCurrentRoundService(
      makeRepo({ findCurrent: mock(async () => round) }),
    );
    const out = await service.execute({});
    expect(out.isSuccess).toBe(true);
    expect((out.result as { round: { id: { value: string } } }).round.id.value).toBe(
      round.id.value,
    );
  });
});
