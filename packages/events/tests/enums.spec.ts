import { describe, expect, it } from "bun:test";

import { DomainEventName, MicroServiceName } from "../src";

describe("enums contract", () => {
  it("DomainEventName values are stable and unique (wire format)", () => {
    const values = Object.values(DomainEventName);
    // Wire-format strings: changing them breaks every consumer. Freeze via test.
    expect(values).toContain("round.prepare");
    expect(values).toContain("round.started");
    expect(values).toContain("round.game_start");
    expect(values).toContain("bet.placed");
    expect(values).toContain("bet.cashed_out");
    expect(values).toContain("round.crashed");
    expect(new Set(values).size).toBe(values.length);
  });

  it("MicroServiceName values are stable and unique", () => {
    const values = Object.values(MicroServiceName);
    expect(values).toEqual(["games", "wallets", "websockets"]);
  });
});
