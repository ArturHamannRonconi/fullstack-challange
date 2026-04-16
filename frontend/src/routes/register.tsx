import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { signinRegister } from '@/features/auth/signin-register'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const auth = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" />
  }

  const onClick = async () => {
    try {
      setIsRedirecting(true)
      await signinRegister()
    } catch (err) {
      setIsRedirecting(false)
      toast.error('Falha ao iniciar o cadastro', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>
            Você será redirecionado para o formulário de cadastro do Keycloak. Nenhum e-mail de
            verificação será enviado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg" disabled={isRedirecting} onClick={onClick}>
            {isRedirecting ? 'Redirecionando…' : 'Criar conta no Keycloak'}
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
