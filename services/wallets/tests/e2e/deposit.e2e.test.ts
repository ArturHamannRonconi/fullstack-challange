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

describe("PATCH /wallets/deposit", () => {
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
    await authedApi.post("/wallets"); // seed: 50_000 cents
  });

  afterAll(async () => {
    await authedApi?.dispose();
    await publicApi?.dispose();
    await closeDb();
  });

  it("returns 401 without Authorization header", async () => {
    const res = await publicApi.patch("/wallets/deposit", {
      data: { amountCents: "1000" },
    });
    expect(res.status()).toBe(401);
  });

  it("returns 200 and increases balance by the deposited amount", async () => {
    const before = await (await authedApi.get("/wallets/me")).json();
    const beforeBalance = BigInt(before.balanceCents);

    const res = await authedApi.patch("/wallets/deposit", {
      data: { amountCents: "1500" },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(BigInt(body.balanceCents)).toBe(beforeBalance + 1500n);
    // History is desc-sorted — newest op is at index 0.
    expect(body.operations[0].type).toBe("DEPOSIT");
    expect(body.operations[0].amountCents).toBe("1500");
  });

  it("records one new DEPOSIT entry per successful call", async () => {
    const before = await (await authedApi.get("/wallets/me")).json();
    const countBefore = before.operations.length;

    await authedApi.patch("/wallets/deposit", { data: { amountCents: "200" } });
    const after = await (await authedApi.get("/wallets/me")).json();

    expect(after.operations.length).toBe(countBefore + 1);
  });

  it("rejects non-numeric amountCents (400)", async () => {
    const res = await authedApi.patch("/wallets/deposit", {
      data: { amountCents: "abc" },
    });
    expect(res.status()).toBe(400);
  });

  it("rejects missing amountCents (400)", async () => {
    const res = await authedApi.patch("/wallets/deposit", { data: {} });
    expect(res.status()).toBe(400);
  });

  it("rejects amount below minimum 100 cents (422)", async () => {
    const res = await authedApi.patch("/wallets/deposit", {
      data: { amountCents: "50" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/between 100 and 100000/);
  });

  it("rejects amount above maximum 100000 cents (422)", async () => {
    const res = await authedApi.patch("/wallets/deposit", {
      data: { amountCents: "100001" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/between 100 and 100000/);
  });

  it("balance remains unchanged after a rejected deposit", async () => {
    const before = await (await authedApi.get("/wallets/me")).json();
    await authedApi.patch("/wallets/deposit", { data: { amountCents: "1" } });
    const after = await (await authedApi.get("/wallets/me")).json();
    expect(after.balanceCents).toBe(before.balanceCents);
  });

  // Sanity check that the wallet exists (created in beforeAll) so tests above
  // were meaningful.
  it("requires an existing wallet for the caller", async () => {
    expect(INITIAL_BALANCE_CENTS).toBeGreaterThan(0n);
    const me = await (await authedApi.get("/wallets/me")).json();
    expect(me.userId).toBe(userId);
  });
});
