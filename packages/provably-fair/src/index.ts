export const CRASH_POINT_SCALE = 100;
export const MAX_52_BITS = Math.pow(2, 52);
export const HOUSE_EDGE_DIVISOR = 20;

export function computeSeedHash(serverSeed: string): string {
  return new Bun.CryptoHasher("sha256").update(serverSeed).digest("hex");
}

/**
 * Deterministic crash point for (serverSeed, nonce). Returns the integer
 * crash point × 100 (e.g., `247` = 2.47x). 5% house edge: if `int % 20 === 0`
 * the round instant-crashes at 1.00x.
 */
export function computeCrashPointScaled(serverSeed: string, nonce: string | number): number {
  const hmac = new Bun.CryptoHasher("sha256", serverSeed);
  hmac.update(nonce.toString());
  const hash = hmac.digest("hex");

  const hex = hash.slice(0, 13);
  const int = parseInt(hex, 16);

  const isInstantCrash = int % HOUSE_EDGE_DIVISOR === 0;
  if (isInstantCrash) return CRASH_POINT_SCALE;

  const result = (100 * MAX_52_BITS - int) / (MAX_52_BITS - int);
  return Math.floor(result);
}

/**
 * Decimal crash point (e.g., `2.47`). Convenience for logs/UI.
 */
export function computeCrashPoint(serverSeed: string, nonce: string | number): number {
  return computeCrashPointScaled(serverSeed, nonce) / CRASH_POINT_SCALE;
}

/**
 * Verifies that a given (serverSeed, nonce) pair yields the expected crash
 * point (scaled × 100). Use this in the player verifier UI.
 */
export function verifyCrashPoint(
  serverSeed: string,
  nonce: string | number,
  expectedScaled: number,
): boolean {
  return computeCrashPointScaled(serverSeed, nonce) === expectedScaled;
}

export function generateServerSeed(): string {
  return crypto.randomUUID();
}

