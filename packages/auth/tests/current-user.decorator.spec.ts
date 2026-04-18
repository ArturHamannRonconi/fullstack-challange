import { describe, expect, it } from "bun:test";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";

import { CurrentUser, type AuthenticatedUser } from "../src";

/**
 * `CurrentUser` is built with `createParamDecorator` — the factory function
 * Nest calls at request time is reachable via the route-args metadata. Invoke
 * it with a stubbed ExecutionContext that mimics Nest's HTTP adapter shape,
 * so we can exercise the extraction logic without bootstrapping Nest.
 */
class ProbeController {
  handler(@CurrentUser() _user: AuthenticatedUser) {}
}

function getDecoratorFactory() {
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    ProbeController,
    "handler",
  ) as Record<string, { factory: (data: unknown, ctx: unknown) => unknown }>;
  const entries = Object.values(metadata);
  return entries[0].factory;
}

function contextWithUser(user: AuthenticatedUser | undefined) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => () => {},
    }),
  };
}

describe("@CurrentUser() decorator factory", () => {
  it("extracts request.user from the ExecutionContext", () => {
    const factory = getDecoratorFactory();
    const result = factory(
      undefined,
      contextWithUser({ userId: "u1", username: "alice", roles: ["player"] }),
    );
    expect(result).toEqual({ userId: "u1", username: "alice", roles: ["player"] });
  });

  it("returns undefined when the request has no user (guard misconfiguration)", () => {
    const factory = getDecoratorFactory();
    const result = factory(undefined, contextWithUser(undefined));
    expect(result).toBeUndefined();
  });
});
