import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { toast } from 'sonner'

export const Route = createFileRoute('/callback')({
  component: CallbackPage,
})

function CallbackPage() {
  const auth = useAuth()

  useEffect(() => {
    if (auth.error) {
      toast.error('Falha ao autenticar', { description: auth.error.message })
    }
  }, [auth.error])

  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" />
  }

  if (auth.error) {
    return <Navigate to="/login" />
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Concluindo autenticação…</p>
      </div>
    </main>
  )
}
