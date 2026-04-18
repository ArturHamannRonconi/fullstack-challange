import { describe, expect, it } from "bun:test";

import {
  BETTING_WINDOW_MS,
  MAX_BET_CENTS,
  MIN_BET_CENTS,
  MULTIPLIER_SCALE,
  PHASE_TRANSITION_MS,
  SPEED,
  TICK_INTERVAL_MS,
  computeMultiplier,
  computeMultiplierScaled,
} from "../src";

describe("@crash/game constants", () => {
  it("has the expected static values", () => {
    expect(SPEED).toBe(0.00006);
    expect(BETTING_WINDOW_MS).toBe(10_000);
    expect(PHASE_TRANSITION_MS).toBe(500);
    expect(TICK_INTERVAL_MS).toBe(100);
    expect(MULTIPLIER_SCALE).toBe(10_000n);
    expect(MIN_BET_CENTS).toBe(100n);
    expect(MAX_BET_CENTS).toBe(100_000n);
  });
});

describe("computeMultiplier", () => {
  it("returns 1 at or before t=0", () => {
    expect(computeMultiplier(0)).toBe(1);
    expect(computeMultiplier(-1)).toBe(1);
  });

  it("increases monotonically with elapsed time", () => {
    const at1s = computeMultiplier(1_000);
    const at5s = computeMultiplier(5_000);
    const at10s = computeMultiplier(10_000);
    expect(at1s).toBeLessThan(at5s);
    expect(at5s).toBeLessThan(at10s);
  });

  it("matches the documented 2.00x around 11.55s", () => {
    // The doc comment claims ~2.00x at 11.55s.
    const m = computeMultiplier(11_550);
    expect(m).toBeGreaterThan(1.99);
    expect(m).toBeLessThan(2.01);
  });
});

describe("computeMultiplierScaled", () => {
  it("returns MULTIPLIER_SCALE (10_000) at t=0", () => {
    expect(computeMultiplierScaled(0)).toBe(10_000n);
  });

  it("floors to avoid crediting the player fractional cents", () => {
    // At 11.55s we expect ~19999 or ~20000 depending on math; must be < 20001.
    const scaled = computeMultiplierScaled(11_550);
    expect(scaled).toBeGreaterThanOrEqual(19_900n);
    expect(scaled).toBeLessThanOrEqual(20_100n);
  });

  it("returns bigint values for domain math safety", () => {
    expect(typeof computeMultiplierScaled(5_000)).toBe("bigint");
  });
});
