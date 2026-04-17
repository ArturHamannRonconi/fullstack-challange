import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { APIRequestContext } from "playwright";

import {
  extractSubFromToken,
  getAccessToken,
  makeAuthedApi,
  makePublicApi,
  waitForWalletsUp,
} from "./helpers/api";
import { INITIAL_BALANCE_CENTS } from "./helpers/constants";
import { closeDb, resetWalletForUser } from "./helpers/db";

describe("GET /wallets/me", () => {
  let authedApi: APIRequestContext;
  let publicApi: APIRequestContext;
  let userId: string;

  beforeAll(async () => {
    await waitForWalletsUp();
    const token = await getAccessToken();
    userId = extractSubFromToken(token);
    authedApi = await makeAuthedApi(token);
    publicApi = await makePublicApi();
    await resetWalletForUser(userId);
  });

  afterAll(async () => {
    await authedApi?.dispose();
    await publicApi?.dispose();
    await closeDb();
  });

  it("returns 401 without Authorization header", async () => {
    const res = await publicApi.get("/wallets/me");
    expect(res.status()).toBe(401);
  });

  it("returns 404 when the user has no wallet yet", async () => {
    const res = await authedApi.get("/wallets/me");
    expect(res.status()).toBe(404);
  });

  it("returns 200 with the wallet snapshot after creation", async () => {
    await authedApi.post("/wallets");
    const res = await authedApi.get("/wallets/me");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.userId).toBe(userId);
    expect(body.balanceCents).toBe(INITIAL_BALANCE_CENTS.toString());
    expect(body.availableCents).toBe(INITIAL_BALANCE_CENTS.toString());
    expect(body.reservedCents).toBe("0");
    expect(Array.isArray(body.operations)).toBe(true);
    expect(Array.isArray(body.reserves)).toBe(true);
    expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
