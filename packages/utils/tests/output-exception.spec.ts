import { describe, expect, it } from "bun:test";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { toNestException } from "../src";

describe("toNestException", () => {
  it.each([
    [400, BadRequestException],
    [401, UnauthorizedException],
    [403, ForbiddenException],
    [404, NotFoundException],
    [409, ConflictException],
    [422, UnprocessableEntityException],
    [502, BadGatewayException],
  ] as const)("maps statusCode %d to the matching Nest exception", (code, ExceptionCtor) => {
    const exc = toNestException({ message: "oops", statusCode: code });
    expect(exc).toBeInstanceOf(ExceptionCtor);
    expect(exc.getStatus()).toBe(code);
    expect(exc.getResponse()).toHaveProperty("message", "oops");
  });

  it("falls back to a generic HttpException for unknown statusCodes", () => {
    const exc = toNestException({ message: "weird", statusCode: 418 });
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc.getStatus()).toBe(418);
  });

  it("defaults to 500 when statusCode is missing", () => {
    const exc = toNestException({
      message: "boom",
      statusCode: undefined as unknown as number,
    });
    expect(exc.getStatus()).toBe(500);
  });

  it("preserves array messages (class-validator style)", () => {
    const exc = toNestException({
      message: ["amount required", "amount must be positive"] as unknown as string,
      statusCode: 400,
    });
    expect(exc).toBeInstanceOf(BadRequestException);
    const res = exc.getResponse() as { message: string[] };
    expect(res.message).toEqual(["amount required", "amount must be positive"]);
  });
});
