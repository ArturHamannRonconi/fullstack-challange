/**
 * Client-side provably-fair verification using WebCrypto.
 *
 * Mirrors `packages/provably-fair` but avoids `Bun.CryptoHasher` so it runs
 * in the browser. Keep the constants and formulas in sync with that package
 * whenever the house edge changes.
 */

export const CRASH_POINT_SCALE = 100
export const MAX_52_BITS = Math.pow(2, 52)
export const HOUSE_EDGE_DIVISOR = 20

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function computeSeedHash(serverSeed: string): Promise<string> {
  const data = new TextEncoder().encode(serverSeed)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message),
  )
  return toHex(sig)
}

export async function computeCrashPointScaled(
  serverSeed: string,
  nonce: string | number,
): Promise<number> {
  const hash = await hmacSha256Hex(serverSeed, String(nonce))
  const hex = hash.slice(0, 13)
  const int = parseInt(hex, 16)

  if (int % HOUSE_EDGE_DIVISOR === 0) return CRASH_POINT_SCALE

  const result = (100 * MAX_52_BITS - int) / (MAX_52_BITS - int)
  return Math.floor(result)
}

export interface ClientVerification {
  /** Whether sha256(serverSeed) matches the committed seedHash. */
  hashMatches: boolean
  /** The crash point recomputed locally × 100 (e.g. 247 = 2.47x). */
  recomputedCrashScaled: number
  /** Whether the recomputed crash point matches what the server reported. */
  crashMatches: boolean
}

export async function clientVerify(input: {
  serverSeed: string
  seedHash: string
  nonce: string | number
  expectedCrashScaled: number
}): Promise<ClientVerification> {
  const [computedHash, computedCrash] = await Promise.all([
    computeSeedHash(input.serverSeed),
    computeCrashPointScaled(input.serverSeed, input.nonce),
  ])
  return {
    hashMatches: computedHash === input.seedHash,
    recomputedCrashScaled: computedCrash,
    crashMatches: computedCrash === input.expectedCrashScaled,
  }
}
