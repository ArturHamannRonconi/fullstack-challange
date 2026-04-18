import { describe, expect, it, mock } from "bun:test";

import {
  DomainEvent,
  DomainEventName,
  DomainHandler,
  type IEventBroker,
  MicroServiceName,
} from "../src";

class TestEvent extends DomainEvent<{ n: number }> {
  constructor(payload: { n: number }) {
    super(payload, DomainEventName.StartGame);
  }
}

class TestHandler extends DomainHandler<{ n: number }> {
  public handled: Array<{ n: number }> = [];
  public shouldThrow = false;

  constructor(broker: IEventBroker) {
    super(broker, DomainEventName.StartGame, MicroServiceName.Games);
  }

  async handle(event: DomainEvent<{ n: number }>): Promise<void> {
    if (this.shouldThrow) throw new Error("boom");
    this.handled.push(event.payload);
  }
}

function brokerFake() {
  const subscribe = mock(async () => {});
  const unsubscribe = mock(async () => {});
  const createQueue = mock(async () => {});
  return {
    subscribe,
    unsubscribe,
    createQueue,
    broker: {
      microService: MicroServiceName.Games,
      client: { subscribe, unsubscribe, publish: async () => {} },
      manager: { createQueue, connect: async () => {}, disconnect: async () => {} },
    } satisfies IEventBroker,
  };
}

describe("DomainHandler base class", () => {
  it("derives a queue name from the event name + microservice", async () => {
    const { broker, createQueue, subscribe } = brokerFake();
    const handler = new TestHandler(broker);
    await handler.onModuleInit();

    // Event name `round.game_start` slugged → `round-game-start-event-games-queue`.
    const expectedQueue = "round-game-start-event-games-queue";
    expect(createQueue).toHaveBeenCalledWith(expectedQueue, DomainEventName.StartGame);
    expect(subscribe).toHaveBeenCalled();
    expect(subscribe.mock.calls[0][0]).toBe(expectedQueue);
  });

  it("acks the message when handle() resolves successfully", async () => {
    const { broker, subscribe } = brokerFake();
    const handler = new TestHandler(broker);
    await handler.onModuleInit();

    const subscribeHandler = subscribe.mock.calls[0][1] as (
      event: DomainEvent<{ n: number }>,
      ctx: { ack: () => void; nack: (requeue?: boolean) => void },
    ) => Promise<void>;
    const ack = mock(() => {});
    const nack = mock(() => {});

    await subscribeHandler(new TestEvent({ n: 42 }), { ack, nack });

    expect(handler.handled).toEqual([{ n: 42 }]);
    expect(ack).toHaveBeenCalledTimes(1);
    expect(nack).not.toHaveBeenCalled();
  });

  it("nacks without requeue when handle() throws", async () => {
    const { broker, subscribe } = brokerFake();
    const handler = new TestHandler(broker);
    handler.shouldThrow = true;
    await handler.onModuleInit();

    const subscribeHandler = subscribe.mock.calls[0][1] as (
      event: DomainEvent<{ n: number }>,
      ctx: { ack: () => void; nack: (requeue?: boolean) => void },
    ) => Promise<void>;
    const ack = mock(() => {});
    const nack = mock(() => {});

    await subscribeHandler(new TestEvent({ n: 1 }), { ack, nack });

    expect(ack).not.toHaveBeenCalled();
    expect(nack).toHaveBeenCalledWith(false);
  });

  it("onModuleDestroy unsubscribes", async () => {
    const { broker, unsubscribe } = brokerFake();
    const handler = new TestHandler(broker);
    await handler.onModuleInit();
    await handler.onModuleDestroy();
    expect(unsubscribe).toHaveBeenCalledWith("round-game-start-event-games-queue");
  });
});
