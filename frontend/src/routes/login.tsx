import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useAuth } from 'react-oidc-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const auth = useAuth()

  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" />
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Autentique-se com sua conta do Keycloak para acessar o Crash Game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            disabled={auth.isLoading}
            onClick={() => auth.signinRedirect()}
          >
            {auth.isLoading ? 'Carregando…' : 'Entrar com Keycloak'}
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link to="/register" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
