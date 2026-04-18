import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type CashedOutPayload } from "@crash/events";

import { GameOrchestratorService } from "../../../src/application/orchestrator/game-orchestrator.service";
import { CashedOutDomainHandler } from "../../../src/infrastructure/handlers/cashed-out.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestEvent extends DomainEvent<CashedOutPayload> {
  constructor(payload: CashedOutPayload) {
    super(payload, DomainEventName.CashedOut);
  }
}

function build() {
  const db = new InMemoryRealTimeDb();
  const orchestrator = {
    onCashedOut: mock(() => {}),
  } as unknown as GameOrchestratorService;
  const handler = new CashedOutDomainHandler(makeFakeBroker(), orchestrator, db);
  return { handler, db, orchestrator };
}

describe("CashedOutDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("converts multiplierScaled (x 10_000 bigint-string) into a float multiplier for the UI", async () => {
    const event = new TestEvent({
      roundId: "r1",
      betId: "b1",
      playerId: "p1",
      username: "alice",
      multiplierScaled: "25000", // 2.5x
      stakedAmountCents: "1000",
      totalPayoutCents: "2500",
      netProfitCents: "1500",
    });

    await ctx.handler.handle(event);

    expect(ctx.orchestrator.onCashedOut).toHaveBeenCalledWith({
      roundId: "r1",
      playerId: "p1",
      username: "alice",
      multiplier: 2.5,
    });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent on redelivery", async () => {
    const event = new TestEvent({
      roundId: "r1",
      betId: "b1",
      playerId: "p1",
      multiplierScaled: "10000",
      stakedAmountCents: "1000",
      totalPayoutCents: "1000",
      netProfitCents: "0",
    });
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);
    expect(ctx.orchestrator.onCashedOut).toHaveBeenCalledTimes(1);
  });
});
