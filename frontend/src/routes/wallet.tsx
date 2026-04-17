import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BalanceCard } from '@/features/wallet/BalanceCard'
import { AmountForm } from '@/features/wallet/AmountForm'
import { OperationHistory } from '@/features/wallet/OperationHistory'
import {
  useDeposit,
  useEnsureWallet,
  useWallet,
  useWithdraw,
} from '@/features/wallet/hooks'
import { WalletApiError } from '@/features/wallet/api'

export const Route = createFileRoute('/wallet')({
  component: WalletPage,
})

function WalletPage() {
  const auth = useAuth()
  const wallet = useWallet()
  const ensure = useEnsureWallet()
  const deposit = useDeposit()
  const withdraw = useWithdraw()

  const shouldBootstrap =
    wallet.isError &&
    wallet.error instanceof WalletApiError &&
    wallet.error.status === 404 &&
    !ensure.isPending

  useEffect(() => {
    if (!shouldBootstrap) return
    ensure.mutate(undefined, {
      onError: (err) => {
        toast.error('Falha ao criar carteira', { description: err.message })
      },
    })
  }, [shouldBootstrap, ensure])

  if (auth.isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    )
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" />
  }

  if ((wallet.isLoading && !wallet.data) || ensure.isPending) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center p-6">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Carregando carteira…</p>
        </div>
      </main>
    )
  }

  if (wallet.isError && !shouldBootstrap) {
    const err = wallet.error
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center p-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Não foi possível carregar sua carteira</CardTitle>
            <CardDescription>
              {err instanceof Error ? err.message : 'Erro desconhecido.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => wallet.refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const data = wallet.data
  if (!data) {
    return null
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Minha carteira</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seu saldo. Saques só são permitidos sobre o valor disponível.
        </p>
      </header>

      <BalanceCard
        balanceCents={data.balanceCents}
        availableCents={data.availableCents}
        reservedCents={data.reservedCents}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Depositar</CardTitle>
            <CardDescription>Adicione fundos à sua carteira.</CardDescription>
          </CardHeader>
          <CardContent>
            <AmountForm
              variant="deposit"
              title="Valor"
              submitLabel="Depositar"
              onSubmit={(amountCents) =>
                deposit.mutateAsync({ amountCents }).then(() => undefined)
              }
              pending={deposit.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sacar</CardTitle>
            <CardDescription>
              Retire fundos do saldo disponível (fundos reservados não podem ser sacados).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AmountForm
              variant="withdraw"
              title="Valor"
              submitLabel="Sacar"
              availableCents={data.availableCents}
              onSubmit={(amountCents) =>
                withdraw.mutateAsync({ amountCents }).then(() => undefined)
              }
              pending={withdraw.isPending}
            />
          </CardContent>
        </Card>
      </section>

      <OperationHistory operations={data.operations} />
    </main>
  )
}
