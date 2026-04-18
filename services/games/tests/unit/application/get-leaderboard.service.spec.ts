import { describe, expect, it, mock } from "bun:test";

import { GetLeaderboardService } from "../../../src/application/services/get-leaderboard/get-leaderboard.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";

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

describe("GetLeaderboardService", () => {
  it("applies defaults page=1 perPage=20 and trims search to undefined when empty", async () => {
    const findLeaderboard = mock(async () => ({ items: [], total: 0 }));
    const service = new GetLeaderboardService(makeRepo({ findLeaderboard }));
    await service.execute({ search: "   " });
    expect(findLeaderboard).toHaveBeenCalledWith({
      page: 1,
      perPage: 20,
      search: undefined,
    });
  });

  it("clamps pagination bounds (page >= 1, perPage in [1,50])", async () => {
    const findLeaderboard = mock(async () => ({ items: [], total: 0 }));
    const service = new GetLeaderboardService(makeRepo({ findLeaderboard }));
    await service.execute({ page: 0, perPage: 999 });
    expect(findLeaderboard).toHaveBeenCalledWith({
      page: 1,
      perPage: 50,
      search: undefined,
    });
  });

  it("returns items/total from the repo and echoes effective pagination", async () => {
    const service = new GetLeaderboardService(
      makeRepo({
        findLeaderboard: mock(async () => ({
          items: [
            {
              playerId: "p1",
              username: "alice",
              totalProfitCents: 100n,
              totalStakedCents: 200n,
              betsCount: 2,
              wins: 1,
              losses: 1,
            },
          ],
          total: 1,
        })),
      }),
    );

    const out = await service.execute({ page: 1, perPage: 10, search: "alice" });
    expect(out.isSuccess).toBe(true);
    const body = out.result as {
      items: unknown[];
      total: number;
      page: number;
      perPage: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.perPage).toBe(10);
  });
});
