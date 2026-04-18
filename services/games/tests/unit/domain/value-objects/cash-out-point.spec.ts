import { describe, expect, it } from "bun:test";

import { CashOutPointValueObject } from "../../../../src/domain/value-objects/cash-out-point/cash-out-point.value-object";

describe("CashOutPointValueObject", () => {
  it("accepts a scaled multiplier >= 10000 (1.00x)", () => {
    const out = CashOutPointValueObject.init({ value: 10_000n });
    expect(out.isSuccess).toBe(true);
    expect((out.result as CashOutPointValueObject).toDecimal()).toBe(1);
  });

  it("accepts a larger scaled multiplier", () => {
    const out = CashOutPointValueObject.init({ value: 25_000n });
    expect(out.isSuccess).toBe(true);
    expect((out.result as CashOutPointValueObject).toDecimal()).toBe(2.5);
  });

  it("rejects anything below 10000", () => {
    const out = CashOutPointValueObject.init({ value: 9_999n });
    expect(out.isFailure).toBe(true);
  });

  it("rejects non-bigint values", () => {
    const out = CashOutPointValueObject.init({ value: 10_000 as unknown as bigint });
    expect(out.isFailure).toBe(true);
  });
});
