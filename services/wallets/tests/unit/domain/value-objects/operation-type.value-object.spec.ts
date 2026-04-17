import { describe, expect, it } from "bun:test";

import { OperationTypeValueObject } from "../../../../src/domain/value-objects/operation-type/operation-type.value-object";
import type { OperationType } from "../../../../src/domain/value-objects/operation-type/operation-type.props";

describe("OperationTypeValueObject", () => {
  describe("init", () => {
    it.each<OperationType>(["DEPOSIT", "WITHDRAW", "RESERVE", "LOST", "WIN"])(
      "accepts allowed type %s",
      (value) => {
        const out = OperationTypeValueObject.init({ value });
        expect(out.isSuccess).toBe(true);
        expect((out.result as OperationTypeValueObject).value).toBe(value);
      },
    );

    it("rejects an unknown type", () => {
      const out = OperationTypeValueObject.init({
        value: "REFUND" as OperationType,
      });
      expect(out.isFailure).toBe(true);
      expect((out.result as { message: string }).message).toContain(
        "DEPOSIT, WITHDRAW, RESERVE, LOST, WIN",
      );
    });

    it("is case-sensitive — lowercase is rejected", () => {
      const out = OperationTypeValueObject.init({
        value: "deposit" as unknown as OperationType,
      });
      expect(out.isFailure).toBe(true);
    });

    it("rejects empty string", () => {
      const out = OperationTypeValueObject.init({
        value: "" as OperationType,
      });
      expect(out.isFailure).toBe(true);
    });
  });

  describe("static factories", () => {
    it("deposit() yields DEPOSIT", () => {
      expect(OperationTypeValueObject.deposit().value).toBe("DEPOSIT");
    });

    it("withdraw() yields WITHDRAW", () => {
      expect(OperationTypeValueObject.withdraw().value).toBe("WITHDRAW");
    });

    it("reserve() yields RESERVE", () => {
      expect(OperationTypeValueObject.reserve().value).toBe("RESERVE");
    });

    it("lost() yields LOST", () => {
      expect(OperationTypeValueObject.lost().value).toBe("LOST");
    });

    it("win() yields WIN", () => {
      expect(OperationTypeValueObject.win().value).toBe("WIN");
    });

    it("each factory returns a distinct instance (new each call)", () => {
      const a = OperationTypeValueObject.deposit();
      const b = OperationTypeValueObject.deposit();
      expect(a).not.toBe(b);
      expect(a.value).toBe(b.value);
    });
  });
});
