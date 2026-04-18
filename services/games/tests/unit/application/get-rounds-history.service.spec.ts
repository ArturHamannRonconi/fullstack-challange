import { describe, expect, it, mock } from "bun:test";

import { GetRoundsHistoryService } from "../../../src/application/services/get-rounds-history/get-rounds-history.service";
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

describe("GetRoundsHistoryService", () => {
  it("applies defaults page=1 perPage=20 when args are missing", async () => {
    const findHistory = mock(async () => ({ items: [], total: 0 }));
    const service = new GetRoundsHistoryService(makeRepo({ findHistory }));
    await service.execute({});
    expect(findHistory).toHaveBeenCalledWith({ page: 1, perPage: 20 });
  });

  it("clamps page to >= 1 and perPage to 1..50", async () => {
    const findHistory = mock(async () => ({ items: [], total: 0 }));
    const service = new GetRoundsHistoryService(makeRepo({ findHistory }));
    await service.execute({ page: -5, perPage: 200 });
    expect(findHistory).toHaveBeenCalledWith({ page: 1, perPage: 50 });
  });

  it("returns paginated items + total from the repository", async () => {
    const round = buildRound({ status: "CRASHED" });
    const service = new GetRoundsHistoryService(
      makeRepo({
        findHistory: mock(async () => ({ items: [round], total: 1 })),
      }),
    );
    const out = await service.execute({ page: 1, perPage: 10 });
    expect(out.isSuccess).toBe(true);
    const body = out.result as { items: unknown[]; total: number; page: number; perPage: number };
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.perPage).toBe(10);
  });
});
