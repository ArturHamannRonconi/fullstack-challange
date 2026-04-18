import { describe, expect, it } from "bun:test";

import {
  CRASH_POINT_SCALE,
  HOUSE_EDGE_DIVISOR,
  computeCrashPoint,
  computeCrashPointScaled,
  computeSeedHash,
  verifyCrashPoint,
} from "../src/index";

// Reference vector: same (seed, nonce) as `provably-fair.example.ts`, computed
// value is 5.52x (the inline comments in that file were illustrative only).
const REF_SEED = "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11";
const REF_NONCE = 102847;
const REF_CRASH_SCALED = 552; // 5.52x

describe("@crash/provably-fair", () => {
  describe("computeCrashPointScaled", () => {
    it("returns the expected crash point for the reference vector", () => {
      expect(computeCrashPointScaled(REF_SEED, REF_NONCE)).toBe(REF_CRASH_SCALED);
    });

    it("returns >= 100 (1.00x) always", () => {
      for (let i = 0; i < 200; i += 1) {
        const scaled = computeCrashPointScaled("seed-" + i, i);
        expect(scaled).toBeGreaterThanOrEqual(CRASH_POINT_SCALE);
      }
    });

    it("is deterministic for same (seed, nonce)", () => {
      const a = computeCrashPointScaled(REF_SEED, REF_NONCE);
      const b = computeCrashPointScaled(REF_SEED, REF_NONCE);
      expect(a).toBe(b);
    });

    it("differs for different nonces on same seed", () => {
      const a = computeCrashPointScaled(REF_SEED, 1);
      const b = computeCrashPointScaled(REF_SEED, 2);
      expect(a).not.toBe(b);
    });

    it("instant-crashes at 1.00x roughly 1/HOUSE_EDGE_DIVISOR of the time", () => {
      const SAMPLE = 50_000;
      let instantCrashes = 0;
      // Vary both seed and nonce so the sample isn't a single HMAC chain.
      for (let i = 0; i < SAMPLE; i += 1) {
        const seed = `${REF_SEED}-${i}`;
        if (computeCrashPointScaled(seed, i) === CRASH_POINT_SCALE) {
          instantCrashes += 1;
        }
      }
      const observedRate = instantCrashes / SAMPLE;
      const expectedRate = 1 / HOUSE_EDGE_DIVISOR;
      // 20% relative tolerance; strict enough to catch the divisor changing
      // (e.g. back to 33 → ~3%) without flaking on legitimate variance.
      expect(observedRate).toBeGreaterThan(expectedRate * 0.8);
      expect(observedRate).toBeLessThan(expectedRate * 1.2);
    });

    it("uses a divisor of 20 (5% house edge)", () => {
      expect(HOUSE_EDGE_DIVISOR).toBe(20);
    });
  });

  describe("computeCrashPoint", () => {
    it("decimal form matches reference", () => {
      expect(computeCrashPoint(REF_SEED, REF_NONCE)).toBeCloseTo(5.52, 2);
    });
  });

  describe("computeSeedHash", () => {
    it("returns a 64-char hex string (sha256)", () => {
      const hash = computeSeedHash(REF_SEED);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic", () => {
      expect(computeSeedHash(REF_SEED)).toBe(computeSeedHash(REF_SEED));
    });
  });

  describe("verifyCrashPoint", () => {
    it("accepts the correct pair", () => {
      expect(verifyCrashPoint(REF_SEED, REF_NONCE, REF_CRASH_SCALED)).toBe(true);
    });

    it("rejects a tampered crash point", () => {
      expect(verifyCrashPoint(REF_SEED, REF_NONCE, REF_CRASH_SCALED + 1)).toBe(false);
    });
  });
});
