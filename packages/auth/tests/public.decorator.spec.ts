import { describe, expect, it } from "bun:test";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY, Public } from "../src";

describe("@Public() decorator", () => {
  it("tags the handler with IS_PUBLIC_KEY → true so guards can short-circuit", () => {
    class Ctrl {
      @Public()
      handler() {}
    }
    const instance = new Ctrl();
    const metadata = new Reflector().get(IS_PUBLIC_KEY, instance.handler);
    expect(metadata).toBe(true);
  });

  it("also works as a class decorator", () => {
    @Public()
    class Ctrl {
      handler() {}
    }
    const metadata = new Reflector().get(IS_PUBLIC_KEY, Ctrl);
    expect(metadata).toBe(true);
  });

  it("leaves other handlers untouched", () => {
    class Ctrl {
      @Public()
      publicOne() {}
      privateOne() {}
    }
    const reflector = new Reflector();
    const instance = new Ctrl();
    expect(reflector.get(IS_PUBLIC_KEY, instance.publicOne)).toBe(true);
    expect(reflector.get(IS_PUBLIC_KEY, instance.privateOne)).toBeUndefined();
  });
});
