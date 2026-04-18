import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type BetPlacedPayload } from "@crash/events";
import { Output } from "ddd-tool-kit";

import { ReserveFundsService } from "../../../src/application/services/reserve-funds/reserve-funds.service";
import { BetPlacedDomainHandler } from "../../../src/infrastructure/handlers/bet-placed.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestEvent extends DomainEvent<BetPlacedPayload> {
  constructor(payload: BetPlacedPayload) {
    super(payload, DomainEventName.BetPlaced);
  }
}

function build() {
  const db = new InMemoryRealTimeDb();
  const service = {
    execute: mock(() => Promise.resolve(Output.success())),
  } as unknown as ReserveFundsService;
  const handler = new BetPlacedDomainHandler(makeFakeBroker(), service, db);
  return { handler, db, service };
}

function payload(): BetPlacedPayload {
  return {
    roundId: "round-1",
    betId: "bet-1",
    playerId: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
    username: "alice",
    stakedAmountCents: "1000",
  };
}

describe("BetPlacedDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("translates bet placed → reserve funds service input and marks inbox on success", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.service.execute).toHaveBeenCalledWith({
      messageId: event.messageId,
      userId: event.payload.playerId,
      roundId: event.payload.roundId,
      betId: event.payload.betId,
      amountCents: event.payload.stakedAmountCents,
    });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("skips duplicate delivery of the same messageId", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);
    expect(ctx.service.execute).toHaveBeenCalledTimes(1);
  });

  it("does not mark inbox on failure", async () => {
    ctx.service.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "nope", statusCode: 404 })),
    );
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.db.store.has(`inbox:${event.messageId}`)).toBe(false);
  });
});
