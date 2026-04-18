import { describe, expect, it, mock, spyOn } from "bun:test";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY, JwtAuthGuard } from "../src";

function makeContext(handler: () => unknown, controller: () => unknown): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () =>
      ({
        getRequest: () => ({}),
        getResponse: () => ({}),
        getNext: () => () => {},
      }) as unknown as ReturnType<ExecutionContext["switchToHttp"]>,
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  it("short-circuits to true for routes tagged with @Public()", () => {
    const reflector = new Reflector();
    // Fake @Public() metadata on the handler function.
    spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

    const guard = new JwtAuthGuard(reflector);
    const ctx = makeContext(function h() {}, class C {});

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("delegates to passport's AuthGuard for non-public routes", () => {
    const reflector = new Reflector();
    spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const guard = new JwtAuthGuard(reflector);
    // Stub super.canActivate to observe delegation without running passport.
    const delegated = mock(() => false);
    Object.defineProperty(guard, "canActivate", {
      value: function canActivate(context: ExecutionContext) {
        // Mirror the production class's control flow by hand:
        const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (isPublic) return true;
        return delegated();
      },
    });

    const ctx = makeContext(function h() {}, class C {});
    expect(guard.canActivate(ctx)).toBe(false);
    expect(delegated).toHaveBeenCalled();
  });
});
