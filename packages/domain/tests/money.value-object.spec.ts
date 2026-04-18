import { describe, expect, it } from "bun:test";

import { MoneyValueObject } from "../src";

const money = (cents: bigint) =>
  MoneyValueObject.init({ value: cents }).result as MoneyValueObject;

describe("MoneyValueObject", () => {
  describe("init", () => {
    it("accepts zero cents", () => {
      const out = MoneyValueObject.init({ value: 0n });
      expect(out.isSuccess).toBe(true);
    });

    it("rejects negative cents", () => {
      const out = MoneyValueObject.init({ value: -1n });
      expect(out.isFailure).toBe(true);
    });

    it("rejects non-bigint inputs (guarded against typescript bypass)", () => {
      const out = MoneyValueObject.init({ value: 100 as unknown as bigint });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("add / subtract", () => {
    it("adds exactly (the floating-point trap)", () => {
      // In IEEE 754: 0.1 + 0.2 !== 0.3. In cents + bigint it's always exact.
      const ten = money(10n);
      const twenty = money(20n);
      const sum = ten.add(twenty).result as MoneyValueObject;
      expect(sum.cents).toBe(30n);
    });

    it("subtract below zero returns Output.fail (no negative money)", () => {
      const out = money(100n).subtract(money(101n));
      expect(out.isFailure).toBe(true);
    });

    it("subtract to exactly zero is allowed", () => {
      const out = money(100n).subtract(money(100n));
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(0n);
    });
  });

  describe("multiplyByScaledMultiplier", () => {
    it("truncates toward zero (favor the house)", () => {
      // 999 cents * 10001 / 10000 = 999.0999 → 999 (floored, not 1000)
      const out = money(999n).multiplyByScaledMultiplier(10_001n);
      expect(out.isSuccess).toBe(true);
      expect((out.result as MoneyValueObject).cents).toBe(999n);
    });

    it("1.00x scaled multiplier returns the same amount", () => {
      const out = money(1_234n).multiplyByScaledMultiplier(10_000n);
      expect((out.result as MoneyValueObject).cents).toBe(1_234n);
    });

    it("handles large multipliers without losing precision", () => {
      // 1_000 cents * 12.3456x → 12345 cents.
      const out = money(1_000n).multiplyByScaledMultiplier(123_456n);
      expect((out.result as MoneyValueObject).cents).toBe(12_345n);
    });
  });

  describe("comparisons", () => {
    it("compareTo returns -1 / 0 / 1", () => {
      expect(money(1n).compareTo(money(2n))).toBe(-1);
      expect(money(2n).compareTo(money(2n))).toBe(0);
      expect(money(3n).compareTo(money(2n))).toBe(1);
    });

    it("isGreaterThanOrEqual / isLessThanOrEqual match common cases", () => {
      expect(money(100n).isGreaterThanOrEqual(money(100n))).toBe(true);
      expect(money(99n).isGreaterThanOrEqual(money(100n))).toBe(false);
      expect(money(100n).isLessThanOrEqual(money(100n))).toBe(true);
      expect(money(101n).isLessThanOrEqual(money(100n))).toBe(false);
    });

    it("isZero only for exactly 0 cents", () => {
      expect(money(0n).isZero()).toBe(true);
      expect(money(1n).isZero()).toBe(false);
    });
  });

  describe("serialization", () => {
    it("toCentsString returns bigint without loss", () => {
      expect(money(9_007_199_254_740_993n).toCentsString()).toBe(
        "9007199254740993",
      );
    });

    it("toBRL formats with BRL currency symbol", () => {
      // Number() conversion is only for final display — domain math stays bigint.
      const fmt = money(1_234_567n).toBRL();
      expect(fmt).toContain("12.345,67");
    });
  });

  describe("factories", () => {
    it("fromCents accepts bigint / number / string inputs", () => {
      expect((MoneyValueObject.fromCents(100n).result as MoneyValueObject).cents).toBe(100n);
      expect((MoneyValueObject.fromCents(100).result as MoneyValueObject).cents).toBe(100n);
      expect((MoneyValueObject.fromCents("100").result as MoneyValueObject).cents).toBe(100n);
    });

    it("fromCents rejects malformed strings", () => {
      expect(MoneyValueObject.fromCents("not-a-number").isFailure).toBe(true);
    });

    it("fromCents truncates floats (no silent rounding)", () => {
      // Math.trunc(10.99) = 10 — fromCents converts via trunc before bigint.
      expect((MoneyValueObject.fromCents(10.99).result as MoneyValueObject).cents).toBe(10n);
    });

    it("zero() returns a valid Money with 0 cents", () => {
      expect(MoneyValueObject.zero().cents).toBe(0n);
    });
  });
});
