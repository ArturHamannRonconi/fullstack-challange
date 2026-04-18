import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Browser, Page } from "playwright";

import {
  FRONTEND_URL,
  REF_SEED,
  REF_SEED_HASH,
  REF_ROUND_ID_16,
  launchBrowser,
  teardownBrowser,
} from "./helpers/browser";

/**
 * These tests exercise the ProvablyFairCard rendering. Store hydration in
 * production depends on the WebSocket connecting, which isn't possible
 * without the full stack up — so we drive the Zustand store directly via
 * the `window.__gameStore` shim that the dev build exposes.
 */
async function setGameState(
  page: Page,
  overrides: Record<string, unknown>,
): Promise<void> {
  await page.evaluate((patch) => {
    const store = (window as unknown as { __gameStore?: { setState: (p: unknown) => void } })
      .__gameStore;
    if (!store) throw new Error("__gameStore not exposed on window (dev build only)");
    store.setState(patch);
  }, overrides);
}

describe("/game Provably Fair card (browser)", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    const ctx = await launchBrowser();
    browser = ctx.browser;
    page = ctx.page;
    // Prevent games API calls from failing noisily — return empty/null.
    await page.route("**/games/rounds/current", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "null" }),
    );
    await page.route("**/games/rounds/history*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, perPage: 20 }),
      }),
    );
    await page.route("**/games/wallets/me", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
    );
  });

  afterAll(async () => {
    if (browser) await teardownBrowser(browser);
  });

  it("renders the Provably Fair card placeholder when no round is live", async () => {
    await page.goto(`${FRONTEND_URL}/game`);
    await page
      .getByText("Provably Fair", { exact: true })
      .waitFor({ timeout: 15_000 });
    await page.getByText(/Aguardando próximo round/i).waitFor();
  });

  it("shows the seed hash (committed) during an active round", async () => {
    await page.goto(`${FRONTEND_URL}/game`);
    await page
      .getByText("Provably Fair", { exact: true })
      .waitFor({ timeout: 15_000 });

    await setGameState(page, {
      phase: "betting_open",
      roundId: REF_ROUND_ID_16,
      seedHash: REF_SEED_HASH,
      revealedSeed: null,
    });

    const expectedHead = REF_SEED_HASH.slice(0, 16);
    await page.getByText(expectedHead, { exact: false }).first().waitFor({
      timeout: 5_000,
    });

    expect(await page.getByText("COMPROMETIDA", { exact: true }).isVisible()).toBe(true);
    expect(await page.getByText("REVELADA", { exact: true }).count()).toBe(0);
    expect(await page.getByText("Server Seed (revelada)", { exact: true }).count()).toBe(0);
  });

  it("reveals the server seed after the round has crashed", async () => {
    await page.goto(`${FRONTEND_URL}/game`);
    await page
      .getByText("Provably Fair", { exact: true })
      .waitFor({ timeout: 15_000 });

    await setGameState(page, {
      phase: "crashed",
      roundId: REF_ROUND_ID_16,
      seedHash: REF_SEED_HASH,
      revealedSeed: REF_SEED,
    });

    await page
      .getByText("Server Seed (revelada)", { exact: true })
      .waitFor({ timeout: 5_000 });
    expect(await page.getByText("REVELADA", { exact: true }).isVisible()).toBe(true);

    const seedHead = REF_SEED.slice(0, 16);
    expect(
      await page.getByText(seedHead, { exact: false }).first().isVisible(),
    ).toBe(true);
  });

  it("exposes a link to the verifier page for the current round", async () => {
    await page.goto(`${FRONTEND_URL}/game`);
    await page
      .getByText("Provably Fair", { exact: true })
      .waitFor({ timeout: 15_000 });

    await setGameState(page, {
      phase: "betting_open",
      roundId: REF_ROUND_ID_16,
      seedHash: REF_SEED_HASH,
      revealedSeed: null,
    });

    const link = page.getByRole("link", { name: /Abrir verificador/i });
    await link.waitFor({ timeout: 5_000 });
    const href = await link.getAttribute("href");
    expect(href).toBe(`/verify/${REF_ROUND_ID_16}`);
  });
});
