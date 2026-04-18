import "reflect-metadata";
import { describe, expect, it } from "bun:test";

import { REAL_TIME_DB, RealTimeDbModule } from "../src";

// Assert the module wiring without bootstrapping Nest (avoids pulling
// @nestjs/testing as a devDep into this pure package). The goal is to catch
// refactors that break the REAL_TIME_DB provider registration.
describe("RealTimeDbModule metadata", () => {
  it("declares REAL_TIME_DB as a provider and exports it", () => {
    const providers = Reflect.getMetadata("providers", RealTimeDbModule) as
      | Array<{ provide?: unknown }>
      | undefined;
    expect(providers).toBeDefined();
    expect(providers!.some((p) => p.provide === REAL_TIME_DB)).toBe(true);

    const exports_ = Reflect.getMetadata("exports", RealTimeDbModule) as unknown[];
    expect(exports_).toContain(REAL_TIME_DB);
  });
});
