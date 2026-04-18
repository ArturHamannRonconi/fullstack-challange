import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IEventBroker } from "@crash/events";
import { MicroServiceName } from "@crash/events";
import type { IRealTimeDb } from "@crash/real-time-db";

import { GameOrchestratorService } from "../../../src/application/orchestrator/game-orchestrator.service";
import { RoundStateStore } from "../../../src/infrastructure/nosql/round-state.store";
import type { GameGateway } from "../../../src/presentation/gateway/game.gateway";

function makeGatewayStub() {
  return {
    broadcastPreparing: mock(() => {}),
    broadcastStart: mock(() => {}),
    broadcastBettingOpen: mock(() => {}),
    broadcastBet: mock(() => {}),
    broadcastBettingClosed: mock(() => {}),
    broadcastGameStart: mock(() => {}),
    broadcastTick: mock(() => {}),
    broadcastCashOut: mock(() => {}),
    broadcastCrashed: mock(() => {}),
  } as unknown as GameGateway;
}

function makeDb(): IRealTimeDb {
  return {
    get: mock(async () => null),
    set: mock(async () => {}),
    del: mock(async () => {}),
    exists: mock(async () => false),
  };
}

function makeBroker(): { broker: IEventBroker; publish: ReturnType<typeof mock> } {
  const publish = mock(async () => {});
  return {
    publish,
    broker: {
      microService: MicroServiceName.Websockets,
      client: { publish, subscribe: async () => {}, unsubscribe: async () => {} },
      manager: { connect: async () => {}, disconnect: async () => {}, createQueue: async () => {} },
    },
  };
}

function makeOrchestrator() {
  const gateway = makeGatewayStub();
  const { broker, publish } = makeBroker();
  const state = new RoundStateStore(makeDb());
  const service = new GameOrchestratorService(broker, gateway, state);
  return { service, gateway, publish };
}

describe("GameOrchestratorService", () => {
  beforeEach(() => {
    // onStartRound schedules a timer; real timers leak across tests.
    // Use bun's test utilities to clear any outstanding timers.
  });

  afterEach(() => {
    // Nothing persistent — each test builds a fresh orchestrator.
  });

  it("getSnapshot starts in idle with no active round", () => {
    const { service } = makeOrchestrator();
    expect(service.getSnapshot()).toEqual({ phase: "idle", active: null });
  });

  it("onStartRound transitions phase to waiting_start and broadcasts start", () => {
    const { service, gateway } = makeOrchestrator();
    service.onStartRound({ roundId: "r1", seedHash: "h", crashPointScaled: 300 });
    expect(service.getSnapshot().phase).toBe("waiting_start");
    expect(service.getSnapshot().active).toEqual({
      roundId: "r1",
      seedHash: "h",
      crashPointScaled: 300,
    });
    expect(gateway.broadcastStart).toHaveBeenCalledWith({
      roundId: "r1",
      seedHash: "h",
    });
  });

  it("onBetPlaced passes through to gateway broadcastBet", () => {
    const { service, gateway } = makeOrchestrator();
    const payload = {
      roundId: "r1",
      playerId: "p1",
      username: "alice",
      stakedAmount: "1000",
    };
    service.onBetPlaced(payload);
    expect(gateway.broadcastBet).toHaveBeenCalledWith(payload);
  });

  it("onCashedOut passes through to gateway broadcastCashOut", () => {
    const { service, gateway } = makeOrchestrator();
    const payload = {
      roundId: "r1",
      playerId: "p1",
      username: "bob",
      multiplier: 2.5,
    };
    service.onCashedOut(payload);
    expect(gateway.broadcastCashOut).toHaveBeenCalledWith(payload);
  });

  it("logs but still accepts onStartRound when phase is unexpected", () => {
    const { service, gateway } = makeOrchestrator();
    // Transition into crashed synthetically by calling onStartRound twice.
    service.onStartRound({ roundId: "r1", seedHash: "h", crashPointScaled: 200 });
    service.onStartRound({ roundId: "r2", seedHash: "h2", crashPointScaled: 400 });
    expect(gateway.broadcastStart).toHaveBeenCalledTimes(2);
    expect(service.getSnapshot().active?.roundId).toBe("r2");
  });
});
