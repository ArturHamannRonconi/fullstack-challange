import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { APIRequestContext } from "playwright";

import { makePublicApi, waitForWalletsUp } from "./helpers/api";

describe("GET /wallets/health", () => {
  let api: APIRequestContext;

  beforeAll(async () => {
    await waitForWalletsUp();
    api = await makePublicApi();
  });

  afterAll(async () => {
    await api?.dispose();
  });

  it("returns 200 without authentication", async () => {
    const res = await api.get("/wallets/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "wallets" });
  });

  it("ignores Authorization when present", async () => {
    const res = await api.get("/wallets/health", {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    expect(res.status()).toBe(200);
  });
});
