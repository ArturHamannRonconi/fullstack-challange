import { describe, expect, it } from "bun:test";

import { DomainEvent, DomainEventName } from "../src";

class TestEvent extends DomainEvent<{ foo: string }> {
  constructor(payload: { foo: string }) {
    super(payload, DomainEventName.StartGame);
  }
}

describe("DomainEvent base class", () => {
  it("assigns a unique messageId (UUID) to each instance", () => {
    const a = new TestEvent({ foo: "a" });
    const b = new TestEvent({ foo: "b" });
    expect(a.messageId).not.toBe(b.messageId);
    expect(a.messageId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("captures occurredAt as an ISO 8601 timestamp", () => {
    const ev = new TestEvent({ foo: "x" });
    expect(ev.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(() => new Date(ev.occurredAt).toISOString()).not.toThrow();
  });

  it("copies the payload reference and the event name", () => {
    const payload = { foo: "hello" };
    const ev = new TestEvent(payload);
    expect(ev.payload).toBe(payload);
    expect(ev.name).toBe(DomainEventName.StartGame);
  });
});
