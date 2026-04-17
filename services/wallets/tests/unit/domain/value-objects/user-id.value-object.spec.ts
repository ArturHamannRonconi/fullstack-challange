import { describe, expect, it } from "bun:test";

import { UserIdValueObject } from "../../../../src/domain/value-objects/user-id/user-id.value-object";

const VALID_UUID_V4 = "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42";

describe("UserIdValueObject", () => {
  describe("init", () => {
    it("accepts a valid UUID v4", () => {
      const out = UserIdValueObject.init({ value: VALID_UUID_V4 });
      expect(out.isSuccess).toBe(true);
    });

    it("accepts UUID in mixed case and normalizes to lowercase", () => {
      const out = UserIdValueObject.init({
        value: "3AE7B3E4-8F10-4E3E-9E92-7B3FBD9E9C42",
      });
      expect(out.isSuccess).toBe(true);
      expect((out.result as UserIdValueObject).value).toBe(VALID_UUID_V4);
    });

    it("accepts UUID padded with whitespace and trims it", () => {
      const out = UserIdValueObject.init({ value: `  ${VALID_UUID_V4}  ` });
      expect(out.isSuccess).toBe(true);
      expect((out.result as UserIdValueObject).value).toBe(VALID_UUID_V4);
    });

    it("rejects 16-char IdValueObject-style ids", () => {
      const out = UserIdValueObject.init({ value: "abcdef0123456789" });
      expect(out.isFailure).toBe(true);
    });

    it("rejects empty string", () => {
      const out = UserIdValueObject.init({ value: "" });
      expect(out.isFailure).toBe(true);
    });

    it("rejects UUID v1 (version byte must be 1-5, but variant must be 8-b; v4 only passes)", () => {
      // UUID v6 with version byte 6 — must fail.
      const out = UserIdValueObject.init({
        value: "3ae7b3e4-8f10-6e3e-9e92-7b3fbd9e9c42",
      });
      expect(out.isFailure).toBe(true);
    });

    it("returns the specific INVALID_USER_ID error on failure", () => {
      const out = UserIdValueObject.init({ value: "not-a-uuid" });
      expect(out.isFailure).toBe(true);
      expect((out.result as { message: string }).message).toContain("UUID");
    });
  });

  describe("equals", () => {
    it("is case-insensitive (normalized on init)", () => {
      const a = UserIdValueObject.init({
        value: "3AE7B3E4-8F10-4E3E-9E92-7B3FBD9E9C42",
      }).result as UserIdValueObject;
      const b = UserIdValueObject.init({
        value: VALID_UUID_V4,
      }).result as UserIdValueObject;
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different UUIDs", () => {
      const a = UserIdValueObject.init({ value: VALID_UUID_V4 })
        .result as UserIdValueObject;
      const b = UserIdValueObject.init({
        value: "4be7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
      }).result as UserIdValueObject;
      expect(a.equals(b)).toBe(false);
    });
  });
});
