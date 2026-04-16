import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useAuth } from 'react-oidc-context'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IdTokenClaims } from '@/features/auth/IdTokenClaims'
import { TokenTimer } from '@/features/auth/TokenTimer'
import { decodeJwt } from '@/lib/jwt'
import { KC_ACCOUNT_URL, KC_CLIENT_ID } from '@/lib/oidc-config'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type TokenTiming = { expiresAtMs: number; issuedAtMs: number }

function safeTiming(token: string | undefined): TokenTiming | null {
  if (!token) return null
  try {
    const claims = decodeJwt(token)
    if (typeof claims.exp !== 'number' || typeof claims.iat !== 'number') return null
    return { expiresAtMs: claims.exp * 1000, issuedAtMs: claims.iat * 1000 }
  } catch {
    return null
  }
}

function DashboardPage() {
  const auth = useAuth()

  const idTokenTiming = useMemo(() => safeTiming(auth.user?.id_token), [auth.user?.id_token])
  const refreshTokenTiming = useMemo(
    () => safeTiming(auth.user?.refresh_token),
    [auth.user?.refresh_token],
  )

  if (auth.isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    )
  }

  if (!auth.isAuthenticated || !auth.user) {
    return <Navigate to="/login" />
  }

  const user = auth.user
  const accessTiming: TokenTiming | null =
    typeof user.expires_at === 'number'
      ? {
          expiresAtMs: user.expires_at * 1000,
          issuedAtMs: safeTiming(user.access_token)?.issuedAtMs ?? Date.now(),
        }
      : null

  const displayName =
    (user.profile?.name as string | undefined) ??
    (user.profile?.preferred_username as string | undefined) ??
    'Jogador'

  const openAccountConsole = () => {
    const url = new URL(`${KC_ACCOUNT_URL}/`)
    url.searchParams.set('referrer', KC_CLIENT_ID)
    url.searchParams.set('referrer_uri', `${window.location.origin}/dashboard`)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {displayName}</h1>
          <p className="text-sm text-muted-foreground">Sessão ativa — tokens emitidos pelo Keycloak.</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {accessTiming && (
          <TokenTimer
            label="access_token"
            expiresAtMs={accessTiming.expiresAtMs}
            issuedAtMs={accessTiming.issuedAtMs}
          />
        )}
        {idTokenTiming && (
          <TokenTimer
            label="id_token"
            expiresAtMs={idTokenTiming.expiresAtMs}
            issuedAtMs={idTokenTiming.issuedAtMs}
          />
        )}
        {refreshTokenTiming && (
          <TokenTimer
            label="refresh_token"
            expiresAtMs={refreshTokenTiming.expiresAtMs}
            issuedAtMs={refreshTokenTiming.issuedAtMs}
          />
        )}
      </section>

      <Separator />

      {user.id_token && <IdTokenClaims idToken={user.id_token} />}

      <Separator />

      <section className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={openAccountConsole}>
          Gerenciar perfil
        </Button>
        <Button variant="destructive" onClick={() => auth.signoutRedirect()}>
          Sair
        </Button>
      </section>
    </main>
  )
}
