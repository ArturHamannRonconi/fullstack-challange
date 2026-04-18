import { describe, expect, it } from "bun:test";

import { SeedValueObject } from "../../../../src/domain/value-objects/seed/seed.value-object";

describe("SeedValueObject", () => {
  it("generates a non-empty seed string", () => {
    const seed = SeedValueObject.generate();
    expect(seed.value.length).toBeGreaterThan(0);
  });

  it("exposes a sha256 hash of the seed", () => {
    const seed = SeedValueObject.generate();
    expect(seed.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("computeCrashPointScaledFor is deterministic and >= 100", () => {
    const seed = SeedValueObject.init({ value: "abc123" }).result as SeedValueObject;
    const a = seed.crashPointScaledFor("round-1");
    const b = seed.crashPointScaledFor("round-1");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(100);
  });

  it("verify returns true for the same seed/nonce/expected tuple", () => {
    const seed = SeedValueObject.init({ value: "abc123" }).result as SeedValueObject;
    const scaled = seed.crashPointScaledFor("round-1");
    expect(seed.verify("round-1", scaled)).toBe(true);
    expect(seed.verify("round-1", scaled + 1)).toBe(false);
  });

  it("rejects empty string input", () => {
    const out = SeedValueObject.init({ value: "" });
    expect(out.isFailure).toBe(true);
  });
});
