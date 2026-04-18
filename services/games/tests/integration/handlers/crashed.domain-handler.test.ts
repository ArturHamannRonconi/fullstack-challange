import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type CrashedPayload } from "@crash/events";
import { Output } from "ddd-tool-kit";

import { ProcessCrashService } from "../../../src/application/services/process-crash/process-crash.service";
import { CrashedDomainHandler } from "../../../src/infrastructure/handlers/crashed.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestCrashedEvent extends DomainEvent<CrashedPayload> {
  constructor(payload: CrashedPayload) {
    super(payload, DomainEventName.Crashed);
  }
}

function buildHandler() {
  const db = new InMemoryRealTimeDb();
  const serviceMock = {
    execute: mock(() => Promise.resolve(Output.success())),
  } as unknown as ProcessCrashService;
  const handler = new CrashedDomainHandler(makeFakeBroker(), serviceMock, db);
  return { handler, db, service: serviceMock };
}

function makePayload(overrides: Partial<CrashedPayload> = {}): CrashedPayload {
  return {
    roundId: "round-1",
    crashPointScaled: 247,
    serverSeed: "seed-xyz",
    seedHash: "a".repeat(64),
    ...overrides,
  };
}

describe("CrashedDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof buildHandler>;

  beforeEach(() => {
    ctx = buildHandler();
  });

  it("only forwards roundId to the service (other payload fields are informational)", async () => {
    const payload = makePayload({ roundId: "round-xyz" });
    const event = new TestCrashedEvent(payload);

    await ctx.handler.handle(event);

    expect(ctx.service.execute).toHaveBeenCalledWith({ roundId: "round-xyz" });
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("is idempotent across redeliveries", async () => {
    const event = new TestCrashedEvent(makePayload());
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);

    expect(ctx.service.execute).toHaveBeenCalledTimes(1);
  });

  it("does not mark inbox when the service fails", async () => {
    ctx.service.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "db down", statusCode: 500 })),
    );
    const event = new TestCrashedEvent(makePayload());

    await ctx.handler.handle(event);
    expect(ctx.db.store.has(`inbox:${event.messageId}`)).toBe(false);
  });
});
