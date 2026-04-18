import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { GamesApiError, verifyRound } from '@/features/game/api'
import type { VerifyRoundDto } from '@/features/game/types'
import {
  clientVerify,
  type ClientVerification,
} from '@/lib/provably-fair-verifier'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/verify/$roundId')({
  component: VerifyPage,
})

function RoundSearchForm({ currentRoundId }: { currentRoundId: string }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = inputRef.current?.value.trim()
    if (value) {
      void navigate({ to: '/verify/$roundId', params: { roundId: value } })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        defaultValue={currentRoundId}
        placeholder="ID do round"
        className="flex-1 rounded-md border border-border bg-background/60 px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <Button type="submit" size="sm" variant="outline">
        Verificar
      </Button>
    </form>
  )
}

function VerifyPage() {
  const { roundId } = Route.useParams()

  const { data, error, isLoading, refetch } = useQuery<VerifyRoundDto, GamesApiError>({
    queryKey: ['game', 'verify', roundId],
    queryFn: () => verifyRound(roundId),
    retry: false,
    // Poll every 2s while the round hasn't crashed yet (409); stop once we have data.
    refetchInterval: (q) => {
      if (q.state.data) return false
      const err = q.state.error
      if (err instanceof GamesApiError && err.status === 409) return 2_000
      return false
    },
    refetchIntervalInBackground: false,
  })

  return (
    <main className="mx-auto flex min-h-[calc(100svh-60px)] max-w-3xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verificação Provably Fair</h1>
        <p className="text-sm text-muted-foreground">
          Round <span className="font-mono">{roundId}</span>
        </p>
      </header>

      <RoundSearchForm key={roundId} currentRoundId={roundId} />

      {(isLoading || (error instanceof GamesApiError && error.status === 409 && !data)) && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">
              {error instanceof GamesApiError && error.status === 409
                ? 'Round ainda em andamento — aguardando crash para revelar seed…'
                : 'Buscando dados de verificação…'}
            </p>
          </CardContent>
        </Card>
      )}

      {error && !(error instanceof GamesApiError && error.status === 409) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-destructive">
              Não foi possível verificar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{error.message}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/game">Voltar ao jogo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {data && <VerificationResult data={data} />}
    </main>
  )
}

function VerificationResult({ data }: { data: VerifyRoundDto }) {
  const [client, setClient] = useState<ClientVerification | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    clientVerify({
      serverSeed: data.serverSeed,
      seedHash: data.seedHash,
      nonce: data.roundId,
      expectedCrashScaled: data.crashPointScaled,
    })
      .then((result) => {
        if (!cancelled) setClient(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setClientError(err instanceof Error ? err.message : 'Erro desconhecido')
        }
      })
    return () => {
      cancelled = true
    }
  }, [data])

  const serverValid = data.isValid
  const hashOk = client?.hashMatches ?? null
  const crashOk = client?.crashMatches ?? null
  const allOk = serverValid && hashOk === true && crashOk === true

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm uppercase tracking-widest text-muted-foreground">
            <span>Resultado</span>
            <StatusBadge ok={allOk} pendingLabel="Verificando…" pending={client === null && !clientError} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <VerificationRow
            label="Backend marcou o round como válido"
            ok={serverValid}
          />
          <VerificationRow
            label="SHA-256(serverSeed) bate com o hash comprometido"
            ok={hashOk}
          />
          <VerificationRow
            label="Crash point recomputado localmente bate"
            ok={crashOk}
            detail={
              client
                ? `${(client.recomputedCrashScaled / 100).toFixed(2)}x (servidor: ${(
                    data.crashPointScaled / 100
                  ).toFixed(2)}x)`
                : undefined
            }
          />
          {clientError && (
            <p className="text-xs text-destructive">
              Verificação local falhou: {clientError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Dados do round
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Round ID (nonce)" value={data.roundId} />
          <Separator />
          <Field label="Seed Hash (committed)" value={data.seedHash} />
          <Field label="Server Seed (revealed)" value={data.serverSeed} />
          <Separator />
          <Field
            label="Crash point"
            value={`${(data.crashPointScaled / 100).toFixed(2)}x`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Como verificar manualmente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            1. Confirme que <code className="font-mono">SHA-256(serverSeed)</code> bate
            com o hash comprometido exibido durante o round.
          </p>
          <p>
            2. Calcule{' '}
            <code className="font-mono">HMAC-SHA256(serverSeed, roundId)</code>, pegue
            os 13 primeiros caracteres do hex e converta para inteiro{' '}
            <code className="font-mono">i</code>.
          </p>
          <p>
            3. Se <code className="font-mono">i % 20 === 0</code>, crash = 1.00x (5% de
            house edge). Caso contrário, crash ={' '}
            <code className="font-mono">floor((100·2^52 - i) / (2^52 - i))</code> ÷ 100.
          </p>
          <p>
            Esta página já fez isso localmente no seu navegador (WebCrypto). Os
            indicadores acima mostram se os três passos bateram.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to="/game">Voltar ao jogo</Link>
        </Button>
      </div>
    </div>
  )
}

function VerificationRow({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean | null
  detail?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <StatusBadge ok={ok} />
    </div>
  )
}

function StatusBadge({
  ok,
  pending,
  pendingLabel,
}: {
  ok: boolean | null
  pending?: boolean
  pendingLabel?: string
}) {
  if (pending || ok === null) {
    return (
      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider text-amber-400">
        {pendingLabel ?? '...'}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider',
        ok
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      )}
    >
      {ok ? 'OK' : 'FALHOU'}
    </span>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <p className="break-all rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-xs text-foreground/90">
        {value}
      </p>
    </div>
  )
}
