import { useMemo } from 'react'
import { decodeJwt } from '@/lib/jwt'

type IdTokenClaimsProps = {
  idToken: string
}

const DISPLAY_ORDER: Array<{ key: string; label: string }> = [
  { key: 'sub', label: 'Sub (user id)' },
  { key: 'preferred_username', label: 'Username' },
  { key: 'name', label: 'Nome' },
  { key: 'given_name', label: 'Nome (given)' },
  { key: 'family_name', label: 'Sobrenome' },
  { key: 'email', label: 'E-mail' },
  { key: 'email_verified', label: 'E-mail verificado' },
  { key: 'iss', label: 'Issuer' },
  { key: 'aud', label: 'Audience' },
  { key: 'sid', label: 'Session ID' },
  { key: 'iat', label: 'Emitido em (iat)' },
  { key: 'exp', label: 'Expira em (exp)' },
  { key: 'auth_time', label: 'Autenticado em' },
]

const TIMESTAMP_KEYS = new Set(['iat', 'exp', 'auth_time'])

function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (TIMESTAMP_KEYS.has(key) && typeof value === 'number') {
    return new Date(value * 1000).toLocaleString()
  }
  if (typeof value === 'boolean') return value ? 'sim' : 'não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function IdTokenClaims({ idToken }: IdTokenClaimsProps) {
  const claims = useMemo(() => decodeJwt(idToken), [idToken])

  return (
    <div className="rounded-md border bg-card p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Claims do id_token
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        {DISPLAY_ORDER.map(({ key, label }) => {
          const value = claims[key]
          if (value === undefined) return null
          return (
            <div key={key} className="contents">
              <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
              <dd className="break-all font-mono text-sm">{formatValue(key, value)}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
