import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useAuth } from 'react-oidc-context'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    )
  }

  return auth.isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
}
