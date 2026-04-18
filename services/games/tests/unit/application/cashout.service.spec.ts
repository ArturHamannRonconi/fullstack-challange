import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { IEventBroker } from "@crash/events";
import { MicroServiceName } from "@crash/events";
import type { IRealTimeDb } from "@crash/real-time-db";

import { CashoutService } from "../../../src/application/services/cashout/cashout.service";
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

function makeBroker(): { broker: IEventBroker; publish: ReturnType<typeof mock> } {
  const publish = mock(async () => {});
  return {
    publish,
    broker: {
      microService: MicroServiceName.Games,
      client: {
        publish,
        subscribe: async () => {},
        unsubscribe: async () => {},
      },
      manager: {
        connect: async () => {},
        disconnect: async () => {},
        createQueue: async () => {},
      },
    },
  };
}

describe("CashoutService", () => {
  let nowSpy: ReturnType<typeof spyOn>;
  // Anchor Date.now so multiplier computation is deterministic across tests.
  const ANCHORED_NOW = 1_700_000_000_000;

  beforeEach(() => {
    nowSpy = spyOn(Date, "now").mockReturnValue(ANCHORED_NOW);
  });
  afterEach(() => {
    nowSpy.mockRestore();
  });

  it("returns 404 when there is no active round", async () => {
    const service = new CashoutService(
      makeRepo(),
      new RoundStateStore(makeDb()),
      makeBroker().broker,
    );
    const out = await service.execute({ playerId: PLAYER });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("returns 422 when round is not in RUNNING state", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    const repo = makeRepo({ findCurrent: mock(async () => round) });
    const service = new CashoutService(
      repo,
      new RoundStateStore(makeDb()),
      makeBroker().broker,
    );
    const out = await service.execute({ playerId: PLAYER });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
  });

  it("returns 404 when the player has no bet on the running round", async () => {
    const round = buildRound({ status: "ROUND_START" });
    const repo = makeRepo({ findCurrent: mock(async () => round) });
    // Start time stored 1s ago relative to anchored now.
    const db = makeDb();
    (db.get as ReturnType<typeof mock>).mockImplementation(async (key: string) =>
      key.endsWith("started_at_ms") ? String(ANCHORED_NOW - 1_000) : null,
    );
    const service = new CashoutService(repo, new RoundStateStore(db), makeBroker().broker);
    const out = await service.execute({ playerId: PLAYER });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("caps multiplier to the round's crashPoint when elapsed exceeds it", async () => {
    const round = buildRound({ status: "ROUND_START" });
    round.bets.push(makeBet(PLAYER, 1_000n));

    const db = makeDb();
    // Pretend the round has been running for 2 minutes — that's way past any
    // reasonable crash point; the service must clamp.
    (db.get as ReturnType<typeof mock>).mockImplementation(async (key: string) => {
      if (key.endsWith("started_at_ms")) return String(ANCHORED_NOW - 120_000);
      // Return a tiny crash point (1.50x = 150 scaled) so we can easily check the cap.
      if (key.endsWith("crash_point_scaled")) return "150";
      return null;
    });

    const repo = makeRepo({
      findCurrent: mock(async () => round),
    });
    const { broker, publish } = makeBroker();
    const service = new CashoutService(repo, new RoundStateStore(db), broker);

    const out = await service.execute({ playerId: PLAYER });
    expect(out.isSuccess).toBe(true);
    // Multiplier clamps to 1.50x → scaled (x10000) = 15000
    expect((out.result as { multiplierScaled: bigint }).multiplierScaled).toBe(15_000n);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when round start time is unknown", async () => {
    const round = buildRound({ status: "ROUND_START" });
    // Strip startedAt from the aggregate to simulate missing state.
    // @ts-expect-error - testing anomaly path
    round.props.startedAt = undefined;
    const repo = makeRepo({ findCurrent: mock(async () => round) });
    const service = new CashoutService(repo, new RoundStateStore(makeDb()), makeBroker().broker);
    const out = await service.execute({ playerId: PLAYER });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
