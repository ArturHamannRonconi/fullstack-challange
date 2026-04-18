import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type PrepareRoundPayload } from "@crash/events";
import { Output } from "ddd-tool-kit";

import { PrepareRoundService } from "../../../src/application/services/prepare-round/prepare-round.service";
import { PrepareRoundDomainHandler } from "../../../src/infrastructure/handlers/prepare-round.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestPrepareRoundEvent extends DomainEvent<PrepareRoundPayload> {
  constructor(payload: PrepareRoundPayload) {
    super(payload, DomainEventName.PrepareRound);
  }
}

function buildHandler() {
  const db = new InMemoryRealTimeDb();
  const serviceMock = {
    execute: mock(() => Promise.resolve(Output.success({ round: null }))),
  } as unknown as PrepareRoundService;
  const handler = new PrepareRoundDomainHandler(
    makeFakeBroker(),
    serviceMock,
    db,
  );
  return { handler, db, service: serviceMock };
}

describe("PrepareRoundDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof buildHandler>;

  beforeEach(() => {
    ctx = buildHandler();
  });

  it("invokes the service with the messageId and stores an inbox marker on success", async () => {
    const event = new TestPrepareRoundEvent({ triggerReason: "boot" });
    await ctx.handler.handle(event);

    expect(ctx.service.execute).toHaveBeenCalledWith({ messageId: event.messageId });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent: second delivery with same messageId is a no-op", async () => {
    const event = new TestPrepareRoundEvent({ triggerReason: "after_crash" });
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);

    expect(ctx.service.execute).toHaveBeenCalledTimes(1);
  });

  it("does not store inbox marker when the service fails (so the message can be retried)", async () => {
    ctx.service.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "boom", statusCode: 500 })),
    );
    const event = new TestPrepareRoundEvent({ triggerReason: "manual" });
    await ctx.handler.handle(event);

    expect(ctx.db.store.has(`inbox:${event.messageId}`)).toBe(false);
  });
});
