import { describe, expect, it, mock } from "bun:test";
import type { IEventBroker } from "@crash/events";
import { MicroServiceName } from "@crash/events";
import type { IRealTimeDb } from "@crash/real-time-db";

import { PrepareRoundService } from "../../../src/application/services/prepare-round/prepare-round.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";
import { RoundStateStore } from "../../../src/infrastructure/nosql/round-state.store";

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
      client: { publish, subscribe: async () => {}, unsubscribe: async () => {} },
      manager: { connect: async () => {}, disconnect: async () => {}, createQueue: async () => {} },
    },
  };
}

describe("PrepareRoundService", () => {
  it("creates a BETTING_OPEN round, saves it, caches crash point, and publishes StartRound", async () => {
    const save = mock(async () => {});
    const db = makeDb();
    const repo = makeRepo({ save });
    const { broker, publish } = makeBroker();

    const service = new PrepareRoundService(repo, new RoundStateStore(db), broker);
    const out = await service.execute({ messageId: "msg-1" });

    expect(out.isSuccess).toBe(true);
    const round = (out.result as { round: { id: { value: string }; isBettingOpen: boolean; crashPointScaled: number } }).round;
    expect(round.isBettingOpen).toBe(true);
    expect(round.crashPointScaled).toBeGreaterThanOrEqual(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(db.set).toHaveBeenCalled();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("returns 500 if the repository save throws", async () => {
    const repo = makeRepo({
      save: mock(async () => {
        throw new Error("db down");
      }),
    });
    const service = new PrepareRoundService(
      repo,
      new RoundStateStore(makeDb()),
      makeBroker().broker,
    );
    const out = await service.execute({ messageId: "msg-2" });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(500);
  });
});
