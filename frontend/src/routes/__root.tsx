import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { useAuth } from 'react-oidc-context'
import { Button } from '@/components/ui/button'

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
      <Link to="/" className="text-base font-semibold">
        Crash Game
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {auth.isAuthenticated ? (
          <>
            <span className="text-muted-foreground">{displayName}</span>
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
