import { describe, expect, it } from "bun:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { toNestException } from "@crash/utils";

describe("toNestException", () => {
  const cases: Array<[number, new (msg: string) => HttpException]> = [
    [400, BadRequestException],
    [401, UnauthorizedException],
    [403, ForbiddenException],
    [404, NotFoundException],
    [409, ConflictException],
    [422, UnprocessableEntityException],
  ];

  it.each(cases)(
    "maps status %i to the correct Nest exception",
    (statusCode, Expected) => {
      const ex = toNestException({ message: "msg", statusCode });
      expect(ex).toBeInstanceOf(Expected);
      expect(ex.getStatus()).toBe(statusCode);
    },
  );

  it("falls back to a generic HttpException for other codes", () => {
    const ex = toNestException({ message: "weird", statusCode: 418 });
    expect(ex).toBeInstanceOf(HttpException);
    expect(ex.getStatus()).toBe(418);
    expect(ex.message).toBe("weird");
  });

  it("uses 500 when statusCode is missing", () => {
    const ex = toNestException({
      message: "boom",
    } as unknown as { message: string; statusCode: number });
    expect(ex.getStatus()).toBe(500);
  });
});
