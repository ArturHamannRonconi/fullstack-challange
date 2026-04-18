import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type CrashedPayload } from "@crash/events";
import { Output } from "ddd-tool-kit";

import { SettleCrashedService } from "../../../src/application/services/settle-crashed/settle-crashed.service";
import { CrashedDomainHandler } from "../../../src/infrastructure/handlers/crashed.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestEvent extends DomainEvent<CrashedPayload> {
  constructor(payload: CrashedPayload) {
    super(payload, DomainEventName.Crashed);
  }
}

function build() {
  const db = new InMemoryRealTimeDb();
  const service = {
    execute: mock(() => Promise.resolve(Output.success())),
  } as unknown as SettleCrashedService;
  const handler = new CrashedDomainHandler(makeFakeBroker(), service, db);
  return { handler, db, service };
}

function payload(): CrashedPayload {
  return {
    roundId: "round-1",
    crashPointScaled: 247,
    serverSeed: "seed-xyz",
    seedHash: "a".repeat(64),
  };
}

describe("CrashedDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("forwards only the messageId + roundId to the settle-crashed service", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.service.execute).toHaveBeenCalledWith({
      messageId: event.messageId,
      roundId: event.payload.roundId,
    });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent per messageId", async () => {
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);
    expect(ctx.service.execute).toHaveBeenCalledTimes(1);
  });

  it("does not mark inbox when the service fails", async () => {
    ctx.service.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "boom", statusCode: 500 })),
    );
    const event = new TestEvent(payload());
    await ctx.handler.handle(event);
    expect(ctx.db.store.has(`inbox:${event.messageId}`)).toBe(false);
  });
});
