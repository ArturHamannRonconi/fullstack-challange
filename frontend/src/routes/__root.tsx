import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { useAuth } from 'react-oidc-context'
import { Button } from '@/components/ui/button'
import { BalanceBadge } from '@/features/wallet/BalanceBadge'
import { WalletBootstrap } from '@/features/wallet/WalletBootstrap'

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <AppHeader />
      <WalletBootstrap />
      <Outlet />
      {import.meta.env.DEV && (
        <Suspense>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </>
  )
}

function AppHeader() {
  const auth = useAuth()
  const displayName =
    (auth.user?.profile?.name as string | undefined) ??
    (auth.user?.profile?.preferred_username as string | undefined)

  return (
    <header className="flex items-center justify-between border-b bg-background/80 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-base font-semibold">
          Crash Game
        </Link>
        {auth.isAuthenticated && (
          <nav className="hidden items-center gap-3 text-sm text-muted-foreground md:flex">
            <Link
              to="/dashboard"
              className="hover:text-foreground [&.active]:text-foreground"
              activeOptions={{ exact: true }}
            >
              Dashboard
            </Link>
            <Link
              to="/wallet"
              className="hover:text-foreground [&.active]:text-foreground"
            >
              Carteira
            </Link>
          </nav>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {auth.isAuthenticated ? (
          <>
            <BalanceBadge />
            <span className="hidden text-muted-foreground sm:inline">{displayName}</span>
            <Button size="sm" variant="ghost" onClick={() => auth.signoutRedirect()}>
              Sair
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Criar conta</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
