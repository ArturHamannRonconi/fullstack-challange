import { describe, expect, it } from "bun:test";
import { MoneyValueObject } from "@crash/domain";

const make = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

describe("MoneyValueObject", () => {
  describe("init", () => {
    it("accepts zero", () => {
      const out = MoneyValueObject.init({ value: 0n });
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(0n);
    });

    it("accepts any non-negative bigint", () => {
      const out = MoneyValueObject.init({ value: 123_456n });
      expect(out.isSuccess).toBe(true);
    });

    it("rejects negative amounts", () => {
      const out = MoneyValueObject.init({ value: -1n });
      expect(out.isFailure).toBe(true);
    });

    it("rejects non-bigint values", () => {
      const out = MoneyValueObject.init({ value: 10 as unknown as bigint });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("fromCents", () => {
    it("parses a bigint directly", () => {
      const out = MoneyValueObject.fromCents(100n);
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(100n);
    });

    it("parses a numeric string", () => {
      const out = MoneyValueObject.fromCents("12345");
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(12_345n);
    });

    it("truncates floats to integer cents", () => {
      const out = MoneyValueObject.fromCents(99.9);
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(99n);
    });

    it("fails on non-numeric strings", () => {
      const out = MoneyValueObject.fromCents("abc");
      expect(out.isFailure).toBe(true);
    });

    it("fails on negative values", () => {
      const out = MoneyValueObject.fromCents(-1n);
      expect(out.isFailure).toBe(true);
    });
  });

  describe("static zero", () => {
    it("returns a zero-cent Money", () => {
      const zero = MoneyValueObject.zero();
      expect(zero.cents).toBe(0n);
      expect(zero.isZero()).toBe(true);
    });
  });

  describe("arithmetic", () => {
    it("adds exact cents with no float drift", () => {
      const out = make(10n).add(make(20n));
      expect((out.result as MoneyValueObject).cents).toBe(30n);
    });

    it("subtracts exact cents", () => {
      const out = make(1_050n).subtract(make(50n));
      expect((out.result as MoneyValueObject).cents).toBe(1_000n);
    });

    it("subtract returning zero is valid", () => {
      const out = make(10n).subtract(make(10n));
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(0n);
    });

    it("subtract fails when result would be negative", () => {
      const out = make(10n).subtract(make(20n));
      expect(out.isFailure).toBe(true);
    });

    it("preserves precision for very large amounts", () => {
      const sum = make(9_000_000_000_000_000_000n).add(make(1n));
      expect((sum.result as MoneyValueObject).cents).toBe(
        9_000_000_000_000_000_001n,
      );
    });
  });

  describe("multiplyByScaledMultiplier", () => {
    it("returns exact product when multiplier is 1.0000x", () => {
      const out = make(12_345n).multiplyByScaledMultiplier(10_000n);
      expect((out.result as MoneyValueObject).cents).toBe(12_345n);
    });

    it("truncates toward the house (floor) at 1.9999x", () => {
      // 1000 * 19999 / 10000 = 1999.9 → floor → 1999
      const out = make(1_000n).multiplyByScaledMultiplier(19_999n);
      expect((out.result as MoneyValueObject).cents).toBe(1_999n);
    });

    it("zero amount stays zero regardless of multiplier", () => {
      const out = make(0n).multiplyByScaledMultiplier(50_000n);
      expect((out.result as MoneyValueObject).cents).toBe(0n);
    });

    it("multiplier zero produces zero", () => {
      const out = make(9_999n).multiplyByScaledMultiplier(0n);
      expect((out.result as MoneyValueObject).cents).toBe(0n);
    });

    it("accepts a custom scale", () => {
      // 100 cents * 2 / 2 = 100
      const out = make(100n).multiplyByScaledMultiplier(2n, 2n);
      expect((out.result as MoneyValueObject).cents).toBe(100n);
    });
  });

  describe("comparisons", () => {
    it("compareTo returns -1 | 0 | 1", () => {
      const a = make(100n);
      const b = make(200n);
      expect(a.compareTo(b)).toBe(-1);
      expect(b.compareTo(a)).toBe(1);
      expect(a.compareTo(a)).toBe(0);
    });

    it("isGreaterThan strict comparison", () => {
      expect(make(200n).isGreaterThan(make(100n))).toBe(true);
      expect(make(100n).isGreaterThan(make(100n))).toBe(false);
    });

    it("isGreaterThanOrEqual inclusive comparison", () => {
      expect(make(100n).isGreaterThanOrEqual(make(100n))).toBe(true);
      expect(make(99n).isGreaterThanOrEqual(make(100n))).toBe(false);
    });

    it("isLessThanOrEqual inclusive comparison", () => {
      expect(make(100n).isLessThanOrEqual(make(100n))).toBe(true);
      expect(make(101n).isLessThanOrEqual(make(100n))).toBe(false);
    });

    it("isZero detects exact zero", () => {
      expect(make(0n).isZero()).toBe(true);
      expect(make(1n).isZero()).toBe(false);
    });
  });

  describe("serialization", () => {
    it("toCents returns the underlying bigint", () => {
      expect(make(500n).toCents()).toBe(500n);
    });

    it("toCentsString returns a plain decimal string (BigInt-safe)", () => {
      expect(make(50_000n).toCentsString()).toBe("50000");
    });

    it("formats as BRL currency", () => {
      expect(make(50_000n).toBRL()).toContain("500,00");
    });
  });
});
