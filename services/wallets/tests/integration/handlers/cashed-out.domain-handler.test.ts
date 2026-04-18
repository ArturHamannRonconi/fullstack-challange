import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type CashedOutPayload } from "@crash/events";
import { Output } from "ddd-tool-kit";

import { SettleCashedOutService } from "../../../src/application/services/settle-cashed-out/settle-cashed-out.service";
import { CashedOutDomainHandler } from "../../../src/infrastructure/handlers/cashed-out.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestEvent extends DomainEvent<CashedOutPayload> {
  constructor(payload: CashedOutPayload) {
    super(payload, DomainEventName.CashedOut);
  }
}

function build() {
  const db = new InMemoryRealTimeDb();
  const service = {
    execute: mock(() => Promise.resolve(Output.success())),
  } as unknown as SettleCashedOutService;
  const handler = new CashedOutDomainHandler(makeFakeBroker(), service, db);
  return { handler, db, service };
}

function payload(): CashedOutPayload {
  return {
    roundId: "round-1",
    betId: "bet-1",
    playerId: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
    username: "alice",
    multiplierScaled: "25000",
    stakedAmountCents: "1000",
    totalPayoutCents: "2500",
    netProfitCents: "1500",
  };
}

describe("CashedOutDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("maps the cashed-out payload to the settle-cashed-out input", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.service.execute).toHaveBeenCalledWith({
      messageId: event.messageId,
      userId: event.payload.playerId,
      roundId: event.payload.roundId,
      betId: event.payload.betId,
      netProfitCents: event.payload.netProfitCents,
      stakedAmountCents: event.payload.stakedAmountCents,
    });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent per messageId", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);
    expect(ctx.service.execute).toHaveBeenCalledTimes(1);
  });

  it("does not mark inbox when settle fails", async () => {
    ctx.service.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "boom", statusCode: 500 })),
    );
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.db.store.has(`inbox:${event.messageId}`)).toBe(false);
  });
});
