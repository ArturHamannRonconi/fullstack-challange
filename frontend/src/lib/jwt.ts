export type JwtClaims = Record<string, unknown> & {
  exp?: number
  iat?: number
  sub?: string
}

export function decodeJwt(token: string): JwtClaims {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 segments')
  }
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
  return JSON.parse(atob(padded)) as JwtClaims
}
