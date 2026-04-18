/**
 * Exponential growth rate for the crash multiplier.
 * multiplier = exp(SPEED * elapsedMs)
 *
 * At 0.00006 the multiplier reaches:
 *   ~2.00x at 11.55s, ~5.00x at 26.82s, ~10.00x at 38.38s.
 */
export const SPEED = 0.00006;

/** Window in which bets can be placed, in milliseconds. */
export const BETTING_WINDOW_MS = 10_000;

/** Pause between phase transitions (start → bet → game → crash → prepare). */
export const PHASE_TRANSITION_MS = 500;

/** Tick cadence for `round:game_tick` broadcasts, in milliseconds. */
export const TICK_INTERVAL_MS = 100;

/** Multiplier internal scale: integer math × 10_000 to avoid floats. */
export const MULTIPLIER_SCALE = 10_000n;

/** Minimum bet in cents (R$ 1,00). */
export const MIN_BET_CENTS = 100n;

/** Maximum bet in cents (R$ 1.000,00). */
export const MAX_BET_CENTS = 100_000n;

/**
 * Compute the live multiplier given elapsed ms since round started.
 * Formula: m = exp(SPEED * elapsedMs). The result is a float — convert to
 * × 10_000 integer using `Math.floor` at the boundary.
 */
export function computeMultiplier(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  return Math.exp(SPEED * elapsedMs);
}

/** Scaled multiplier (× 10_000) — integer, safe for domain math. */
export function computeMultiplierScaled(elapsedMs: number): bigint {
  const asFloat = computeMultiplier(elapsedMs);
  return BigInt(Math.floor(asFloat * Number(MULTIPLIER_SCALE)));
}
