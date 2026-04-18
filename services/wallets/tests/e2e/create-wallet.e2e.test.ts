import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { APIRequestContext } from "playwright";

import {
  extractSubFromToken,
  getAccessToken,
  makeAuthedApi,
  makePublicApi,
  waitForWalletsUp,
} from "./helpers/api";
import { INITIAL_BALANCE_CENTS } from "./helpers/constants";
import { closeDb, resetWalletForUser } from "./helpers/db";

describe("POST /wallets", () => {
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
    const res = await publicApi.post("/wallets");
    expect(res.status()).toBe(401);
  });

  it("creates the wallet (201) with initial balance and one DEPOSIT operation", async () => {
    const res = await authedApi.post("/wallets");
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.userId).toBe(userId);
    expect(body.balanceCents).toBe(INITIAL_BALANCE_CENTS.toString());
    expect(body.availableCents).toBe(INITIAL_BALANCE_CENTS.toString());
    expect(body.reservedCents).toBe("0");
    expect(body.reserves).toEqual([]);
    expect(Array.isArray(body.operations)).toBe(true);
    expect(body.operations.length).toBe(1);
    expect(body.operations[0].type).toBe("DEPOSIT");
    expect(body.operations[0].amountCents).toBe(INITIAL_BALANCE_CENTS.toString());
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBe(16);
  });

  it("is idempotent on repeated calls (200) and keeps the same wallet id", async () => {
    const first = await authedApi.post("/wallets");
    const firstBody = await first.json();

    const second = await authedApi.post("/wallets");
    expect(second.status()).toBe(200);

    const secondBody = await second.json();
    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.userId).toBe(userId);
    // A second create must not add another operation.
    expect(secondBody.operations.length).toBe(firstBody.operations.length);
  });
});
