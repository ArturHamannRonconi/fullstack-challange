import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DomainEvent, DomainEventName, type StartGamePayload } from "@crash/events";
import { Output } from "ddd-tool-kit";

import { StartGameService } from "../../../src/application/services/start-game/start-game.service";
import { StartGameDomainHandler } from "../../../src/infrastructure/handlers/start-game.domain-handler";
import { InMemoryRealTimeDb, makeFakeBroker } from "./helpers/fakes";

class TestStartGameEvent extends DomainEvent<StartGamePayload> {
  constructor(payload: StartGamePayload) {
    super(payload, DomainEventName.StartGame);
  }
}

function buildHandler() {
  const db = new InMemoryRealTimeDb();
  const serviceMock = {
    execute: mock(() => Promise.resolve(Output.success())),
  } as unknown as StartGameService;
  const handler = new StartGameDomainHandler(makeFakeBroker(), serviceMock, db);
  return { handler, db, service: serviceMock };
}

describe("StartGameDomainHandler (integration)", () => {
  let ctx: ReturnType<typeof buildHandler>;

  beforeEach(() => {
    ctx = buildHandler();
  });

  it("forwards the event payload to the service and stores inbox marker", async () => {
    const payload = { roundId: "round-1", startedAtMs: 1_700_000_000_000 };
    const event = new TestStartGameEvent(payload);

    await ctx.handler.handle(event);

    expect(ctx.service.execute).toHaveBeenCalledWith(payload);
    expect(ctx.db.store.get(`inbox:${event.messageId}`)).toBe("1");
  });

  it("skips execution on redelivery (idempotency)", async () => {
    const event = new TestStartGameEvent({
      roundId: "round-2",
      startedAtMs: Date.now(),
    });
    await ctx.handler.handle(event);
    await ctx.handler.handle(event);

    expect(ctx.service.execute).toHaveBeenCalledTimes(1);
  });

  it("does not mark inbox on service failure so message can be retried", async () => {
    ctx.service.execute = mock(() =>
      Promise.resolve(Output.fail({ message: "bad", statusCode: 500 })),
    );
    const event = new TestStartGameEvent({ roundId: "r", startedAtMs: 0 });

    await ctx.handler.handle(event);
    expect(ctx.db.store.has(`inbox:${event.messageId}`)).toBe(false);
  });
});
