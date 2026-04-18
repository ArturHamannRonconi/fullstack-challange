import { describe, expect, it, mock } from "bun:test";
import { IdValueObject } from "ddd-tool-kit";

import { GetMyBetsService } from "../../../src/application/services/get-my-bets/get-my-bets.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";
import { buildRound, makeBet } from "../../integration/controllers/helpers/round-factory";

const PLAYER = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

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

describe("GetMyBetsService", () => {
  it("rejects an invalid playerId", async () => {
    const service = new GetMyBetsService(makeRepo());
    const out = await service.execute({ playerId: "", page: 1, perPage: 10 });
    expect(out.isFailure).toBe(true);
  });

  it("returns an empty list when the player has no bets", async () => {
    const service = new GetMyBetsService(makeRepo());
    const out = await service.execute({ playerId: PLAYER, page: 1, perPage: 10 });
    expect(out.isSuccess).toBe(true);
    const body = out.result as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("joins round + bet by id and drops items whose bet is missing", async () => {
    const roundWithBet = buildRound({ status: "CRASHED" });
    const bet = makeBet(PLAYER);
    roundWithBet.bets.push(bet);

    const orphanRound = buildRound({ status: "CRASHED" });

    const service = new GetMyBetsService(
      makeRepo({
        findBetsByPlayer: mock(async () => ({
          items: [
            { round: roundWithBet, betId: bet.id },
            // Bet ID that doesn't exist on the orphanRound — should be filtered out.
            { round: orphanRound, betId: IdValueObject.getDefault() },
          ],
          total: 2,
        })),
      }),
    );

    const out = await service.execute({ playerId: PLAYER, page: 1, perPage: 10 });
    expect(out.isSuccess).toBe(true);
    const body = out.result as {
      items: { round: unknown; bet: unknown }[];
      total: number;
    };
    expect(body.items).toHaveLength(1);
    // Total is echoed from the repository count, not the filtered length.
    expect(body.total).toBe(2);
  });

  it("clamps perPage to [1, 50]", async () => {
    const findBetsByPlayer = mock(async () => ({ items: [], total: 0 }));
    const service = new GetMyBetsService(makeRepo({ findBetsByPlayer }));
    await service.execute({ playerId: PLAYER, page: 1, perPage: 500 });
    expect(findBetsByPlayer).toHaveBeenCalledWith(expect.anything(), {
      page: 1,
      perPage: 50,
    });
  });
});
