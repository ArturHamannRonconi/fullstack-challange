import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type BetPlacedPayload } from "@crash/events";

import { GameOrchestratorService } from "../../../src/application/orchestrator/game-orchestrator.service";
import { BetPlacedDomainHandler } from "../../../src/infrastructure/handlers/bet-placed.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestEvent extends DomainEvent<BetPlacedPayload> {
  constructor(payload: BetPlacedPayload) {
    super(payload, DomainEventName.BetPlaced);
  }
}

function build() {
  const db = new InMemoryRealTimeDb();
  const orchestrator = {
    onBetPlaced: mock(() => {}),
  } as unknown as GameOrchestratorService;
  const handler = new BetPlacedDomainHandler(makeFakeBroker(), orchestrator, db);
  return { handler, db, orchestrator };
}

describe("BetPlacedDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("translates the broker payload to the orchestrator broadcast shape", async () => {
    const event = new TestEvent({
      roundId: "r1",
      betId: "b1",
      playerId: "p1",
      username: "alice",
      stakedAmountCents: "1000",
    });

    await ctx.handler.handle(event);

    expect(ctx.orchestrator.onBetPlaced).toHaveBeenCalledWith({
      roundId: "r1",
      playerId: "p1",
      username: "alice",
      stakedAmount: "1000",
    });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent on redelivery", async () => {
    const event = new TestEvent({
      roundId: "r1",
      betId: "b1",
      playerId: "p1",
      stakedAmountCents: "1000",
    });
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);
    expect(ctx.orchestrator.onBetPlaced).toHaveBeenCalledTimes(1);
  });
});
