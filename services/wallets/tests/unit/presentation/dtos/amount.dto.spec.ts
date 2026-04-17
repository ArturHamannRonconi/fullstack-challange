import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
  AmountRequestDto,
  DepositRequestDto,
  WithdrawRequestDto,
} from "../../../../src/presentation/dtos/amount.dto";

async function errorsFor(
  dto: typeof AmountRequestDto,
  payload: unknown,
): Promise<string[]> {
  const instance = plainToInstance(dto, payload ?? {});
  const errors = await validate(instance);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe("AmountRequestDto (shared by Deposit/Withdraw)", () => {
  it("accepts a positive numeric string", async () => {
    const errors = await errorsFor(AmountRequestDto, { amountCents: "1000" });
    expect(errors).toEqual([]);
  });

  it("rejects a missing amountCents field", async () => {
    const errors = await errorsFor(AmountRequestDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects an empty string", async () => {
    const errors = await errorsFor(AmountRequestDto, { amountCents: "" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a non-numeric string", async () => {
    const errors = await errorsFor(AmountRequestDto, { amountCents: "abc" });
    expect(errors.some((m) => m.includes("positive integer numeric string"))).toBe(
      true,
    );
  });

  it("rejects negative numeric strings (has a minus sign)", async () => {
    const errors = await errorsFor(AmountRequestDto, { amountCents: "-100" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects decimal strings", async () => {
    const errors = await errorsFor(AmountRequestDto, { amountCents: "10.50" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects strings longer than 16 characters", async () => {
    const errors = await errorsFor(AmountRequestDto, {
      amountCents: "12345678901234567",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects non-string types (numeric value)", async () => {
    const errors = await errorsFor(AmountRequestDto, { amountCents: 1000 });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("DepositRequestDto and WithdrawRequestDto inherit the same rules", () => {
  it("Deposit accepts a valid amountCents", async () => {
    const errors = await errorsFor(DepositRequestDto, { amountCents: "100" });
    expect(errors).toEqual([]);
  });

  it("Withdraw rejects missing amountCents", async () => {
    const errors = await errorsFor(WithdrawRequestDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });
});
