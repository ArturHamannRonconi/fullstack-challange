import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Browser, Page } from "playwright";

import {
  FRONTEND_URL,
  REF_CRASH_SCALED,
  REF_ROUND_ID_NUMERIC,
  REF_SEED,
  REF_SEED_HASH,
  launchBrowser,
  teardownBrowser,
} from "./helpers/browser";

describe("/verify/$roundId (browser)", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    const ctx = await launchBrowser();
    browser = ctx.browser;
    page = ctx.page;
  });

  afterAll(async () => {
    if (browser) await teardownBrowser(browser);
  });

  it("shows all three verification checks as OK when backend and client agree", async () => {
    await page.route("**/games/rounds/*/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          roundId: REF_ROUND_ID_NUMERIC,
          serverSeed: REF_SEED,
          seedHash: REF_SEED_HASH,
          crashPointScaled: REF_CRASH_SCALED,
          isValid: true,
        }),
      }),
    );

    await page.goto(`${FRONTEND_URL}/verify/${REF_ROUND_ID_NUMERIC}`);

    await page
      .getByRole("heading", { name: /Verificação Provably Fair/i })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .getByText("Backend marcou o round como válido", { exact: true })
      .waitFor();
    await page
      .getByText("SHA-256(serverSeed) bate com o hash comprometido", { exact: true })
      .waitFor();
    await page
      .getByText("Crash point recomputado localmente bate", { exact: true })
      .waitFor();

    // WebCrypto is async; give the client a moment to finish then assert no FALHOU.
    await page.waitForFunction(
      () => document.body.innerText.includes("OK") && !document.body.innerText.includes("FALHOU"),
      undefined,
      { timeout: 5_000 },
    );

    const okCount = await page.getByText("OK", { exact: true }).count();
    expect(okCount).toBeGreaterThanOrEqual(3); // header + 3 rows
    const failCount = await page.getByText("FALHOU", { exact: true }).count();
    expect(failCount).toBe(0);

    // Seed, hash, and decimal crash point visible in the payload card.
    expect(await page.getByText(REF_SEED).isVisible()).toBe(true);
    expect(await page.getByText(REF_SEED_HASH).isVisible()).toBe(true);
    expect(await page.getByText("5.52x").first().isVisible()).toBe(true);
  });

  it("flags the crash row as FALHOU when the backend's crashPointScaled is tampered", async () => {
    await page.route("**/games/rounds/*/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          roundId: REF_ROUND_ID_NUMERIC,
          serverSeed: REF_SEED,
          seedHash: REF_SEED_HASH,
          // Tampered — client recomputes 552 and rejects.
          crashPointScaled: 9999,
          isValid: false,
        }),
      }),
    );

    await page.goto(`${FRONTEND_URL}/verify/${REF_ROUND_ID_NUMERIC}`);

    // Hash still matches (seed unchanged).
    await page
      .getByText("SHA-256(serverSeed) bate com o hash comprometido", { exact: true })
      .waitFor();

    // Wait for client-side crypto to finish + UI to reflect the FALHOU verdict.
    await page.waitForFunction(
      () => document.body.innerText.includes("FALHOU"),
      undefined,
      { timeout: 5_000 },
    );

    const failCount = await page.getByText("FALHOU", { exact: true }).count();
    expect(failCount).toBeGreaterThanOrEqual(1);
    // Detail row shows "servidor: 99.99x" — divergence is visible.
    expect(
      await page.getByText(/servidor: 99\.99x/).first().isVisible(),
    ).toBe(true);
  });

  it("shows an error card when the backend returns 409 (round not crashed yet)", async () => {
    await page.route("**/games/rounds/*/verify", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 409,
          message: "Round has not crashed yet — seed is not revealed.",
        }),
      }),
    );

    await page.goto(`${FRONTEND_URL}/verify/some-round-id`);

    // The verify hook retries 409 once; after retry it should render error UI.
    await page
      .getByText(/Não foi possível verificar/i)
      .waitFor({ timeout: 10_000 });
    expect(
      await page
        .getByText(/O round ainda não crashou/i)
        .isVisible(),
    ).toBe(true);
  });

  it("shows an error card when the backend returns 404 (round not found)", async () => {
    await page.route("**/games/rounds/*/verify", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 404, message: "Round not found." }),
      }),
    );

    await page.goto(`${FRONTEND_URL}/verify/missing`);

    await page
      .getByText(/Não foi possível verificar/i)
      .waitFor({ timeout: 10_000 });
    expect(await page.getByText("Round not found.").isVisible()).toBe(true);
  });
});
