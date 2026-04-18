import { describe, expect, it, mock } from "bun:test";
import type { IEventBroker } from "@crash/events";
import { MicroServiceName } from "@crash/events";
import type { IRealTimeDb } from "@crash/real-time-db";

import { PlaceBetService } from "../../../src/application/services/place-bet/place-bet.service";
import type { RoundRepository } from "../../../src/infrastructure/database/repositories/round.repository";
import { buildRound, makeBet } from "../../integration/controllers/helpers/round-factory";

const PLAYER = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

function makeDb(overrides: Partial<IRealTimeDb> = {}): IRealTimeDb {
  return {
    get: mock(async () => null),
    set: mock(async () => {}),
    del: mock(async () => {}),
    exists: mock(async () => false),
    ...overrides,
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
  const broker: IEventBroker = {
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
  };
  return { broker, publish };
}

function walletPayload(availableCents: bigint, balanceCents = availableCents) {
  return JSON.stringify({
    balanceCents: balanceCents.toString(),
    availableCents: availableCents.toString(),
  });
}

describe("PlaceBetService", () => {
  it("returns 404 when the wallet state is not cached", async () => {
    const service = new PlaceBetService(makeDb(), makeRepo(), makeBroker().broker);
    const out = await service.execute({
      playerId: PLAYER,
      username: "p",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("returns 422 when available funds are insufficient", async () => {
    const db = makeDb({ get: mock(async () => walletPayload(500n)) });
    const service = new PlaceBetService(db, makeRepo(), makeBroker().broker);
    const out = await service.execute({
      playerId: PLAYER,
      username: "p",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
  });

  it("returns 404 when there is no active round", async () => {
    const db = makeDb({ get: mock(async () => walletPayload(10_000n)) });
    const service = new PlaceBetService(db, makeRepo(), makeBroker().broker);
    const out = await service.execute({
      playerId: PLAYER,
      username: "p",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(404);
  });

  it("returns 422 when the round is not in BETTING_OPEN", async () => {
    const round = buildRound({ status: "ROUND_START" });
    const db = makeDb({ get: mock(async () => walletPayload(10_000n)) });
    const repo = makeRepo({ findCurrent: mock(async () => round) });
    const service = new PlaceBetService(db, repo, makeBroker().broker);
    const out = await service.execute({
      playerId: PLAYER,
      username: "p",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(422);
  });

  it("returns 409 when the player already has a bet on this round", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    round.bets.push(makeBet(PLAYER));
    const db = makeDb({ get: mock(async () => walletPayload(10_000n)) });
    const repo = makeRepo({ findCurrent: mock(async () => round) });
    const service = new PlaceBetService(db, repo, makeBroker().broker);
    const out = await service.execute({
      playerId: PLAYER,
      username: "p",
      amountCents: "1000",
    });
    expect(out.isFailure).toBe(true);
    expect((out.result as { statusCode: number }).statusCode).toBe(409);
  });

  it("places a bet, persists the round, and publishes BetPlaced", async () => {
    const round = buildRound({ status: "BETTING_OPEN" });
    const db = makeDb({ get: mock(async () => walletPayload(10_000n)) });
    const save = mock(async () => {});
    const repo = makeRepo({
      findCurrent: mock(async () => round),
      save,
    });
    const { broker, publish } = makeBroker();
    const service = new PlaceBetService(db, repo, broker);

    const out = await service.execute({
      playerId: PLAYER,
      username: "alice",
      amountCents: "1000",
    });

    expect(out.isSuccess).toBe(true);
    const body = out.result as {
      balanceCents: string;
      availableCents: string;
      bet: { stakedAmount: { toCentsString: () => string } };
    };
    expect(body.balanceCents).toBe("10000");
    // Available funds should be debited by the staked amount.
    expect(body.availableCents).toBe("9000");
    expect(save).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid amountCents (non-integer) via MoneyValueObject", async () => {
    const db = makeDb({ get: mock(async () => walletPayload(10_000n)) });
    const service = new PlaceBetService(db, makeRepo(), makeBroker().broker);
    const out = await service.execute({
      playerId: PLAYER,
      username: "p",
      amountCents: "not-a-number",
    });
    expect(out.isFailure).toBe(true);
  });
});
