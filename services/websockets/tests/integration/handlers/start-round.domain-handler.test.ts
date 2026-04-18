import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type StartRoundPayload } from "@crash/events";

import { GameOrchestratorService } from "../../../src/application/orchestrator/game-orchestrator.service";
import { StartRoundDomainHandler } from "../../../src/infrastructure/handlers/start-round.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestEvent extends DomainEvent<StartRoundPayload> {
  constructor(payload: StartRoundPayload) {
    super(payload, DomainEventName.StartRound);
  }
}

function build() {
  const db = new InMemoryRealTimeDb();
  const orchestrator = {
    onStartRound: mock(() => {}),
  } as unknown as GameOrchestratorService;
  const handler = new StartRoundDomainHandler(makeFakeBroker(), orchestrator, db);
  return { handler, db, orchestrator };
}

function payload(): StartRoundPayload {
  return { roundId: "round-1", seedHash: "a".repeat(64), crashPointScaled: 247 };
}

describe("StartRoundDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("forwards payload to orchestrator.onStartRound and marks inbox", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.orchestrator.onStartRound).toHaveBeenCalledWith(event.payload);
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent per messageId", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);
    expect(ctx.orchestrator.onStartRound).toHaveBeenCalledTimes(1);
  });
});
