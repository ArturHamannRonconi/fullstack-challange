import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
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

describe("PATCH /wallets/withdraw", () => {
  let authedApi: APIRequestContext;
  let publicApi: APIRequestContext;
  let userId: string;

  beforeAll(async () => {
    await waitForWalletsUp();
    const token = await getAccessToken();
    userId = extractSubFromToken(token);
    authedApi = await makeAuthedApi(token);
    publicApi = await makePublicApi();
  });

  beforeEach(async () => {
    await resetWalletForUser(userId);
    await authedApi.post("/wallets"); // seed: 50_000 cents
  });

  afterAll(async () => {
    await authedApi?.dispose();
    await publicApi?.dispose();
    await closeDb();
  });

  it("returns 401 without Authorization header", async () => {
    const res = await publicApi.patch("/wallets/withdraw", {
      data: { amountCents: "1000" },
    });
    expect(res.status()).toBe(401);
  });

  it("returns 200 and decreases balance by the withdrawn amount", async () => {
    const before = await (await authedApi.get("/wallets/me")).json();
    const beforeBalance = BigInt(before.balanceCents);

    const res = await authedApi.patch("/wallets/withdraw", {
      data: { amountCents: "500" },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(BigInt(body.balanceCents)).toBe(beforeBalance - 500n);
    expect(body.operations[0].type).toBe("WITHDRAW");
    expect(body.operations[0].amountCents).toBe("500");
  });

  it("rejects withdraw exceeding available funds (422 — INSUFFICIENT_FUNDS)", async () => {
    // Drain the wallet to zero: balance starts at 50_000.
    const drain = await authedApi.patch("/wallets/withdraw", {
      data: { amountCents: INITIAL_BALANCE_CENTS.toString() },
    });
    expect(drain.status()).toBe(200);

    // Now try to withdraw any valid-range amount → insufficient.
    const res = await authedApi.patch("/wallets/withdraw", {
      data: { amountCents: "1000" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/[Ii]nsufficient/);

    // Balance must remain 0 — failed withdraw cannot mutate state.
    const me = await (await authedApi.get("/wallets/me")).json();
    expect(me.balanceCents).toBe("0");
  });

  it("rejects amount above maximum 100000 cents (422 — AMOUNT_OUT_OF_RANGE)", async () => {
    const res = await authedApi.patch("/wallets/withdraw", {
      data: { amountCents: "100001" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/between 100 and 100000/);
  });

  it("rejects amount below minimum 100 cents (422 — AMOUNT_OUT_OF_RANGE)", async () => {
    const res = await authedApi.patch("/wallets/withdraw", {
      data: { amountCents: "50" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/between 100 and 100000/);
  });

  it("rejects non-numeric amountCents (400)", async () => {
    const res = await authedApi.patch("/wallets/withdraw", {
      data: { amountCents: "xyz" },
    });
    expect(res.status()).toBe(400);
  });

  it("rejects missing amountCents (400)", async () => {
    const res = await authedApi.patch("/wallets/withdraw", { data: {} });
    expect(res.status()).toBe(400);
  });

  it("balance remains unchanged after a rejected withdraw", async () => {
    const before = await (await authedApi.get("/wallets/me")).json();
    await authedApi.patch("/wallets/withdraw", { data: { amountCents: "999999" } });
    const after = await (await authedApi.get("/wallets/me")).json();
    expect(after.balanceCents).toBe(before.balanceCents);
  });
});
