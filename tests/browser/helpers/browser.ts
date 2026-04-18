import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

// Games API fixtures — same reference vector used by the provably-fair unit
// tests so recomputed values on the client match exactly.
export const REF_SEED = "f9c2a7b4-8d21-4c6f-9a3e-1b7d5e2f9c11";
export const REF_SEED_HASH =
  "a107d97854e1bcb27a2e65a4be0a526f5ef93fbdcadca84db23b6e29b5392d3a";
export const REF_ROUND_ID_NUMERIC = "102847"; // crash = 552 (5.52x)
export const REF_CRASH_SCALED = 552;
export const REF_ROUND_ID_16 = "abcdef0123456789"; // crash = 117 (1.17x)
export const REF_CRASH_SCALED_16 = 117;

export async function launchBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function teardownBrowser(browser: Browser): Promise<void> {
  await browser.close();
}
