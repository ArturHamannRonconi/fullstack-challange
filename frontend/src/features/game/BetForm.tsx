import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WALLET_QUERY_KEY } from '@/features/wallet/hooks'
import { brlInputToCents, centsToBRL } from '@/lib/money'
import { GamesApiError, cashout as cashoutApi, placeBet } from './api'
import { useGameStore } from './store'
import type { CashoutResponseDto, PlaceBetResponseDto } from './types'

const MIN_BET_CENTS = 100n
const MAX_BET_CENTS = 100_000n

function BettingCountdown({ closesAtMs }: { closesAtMs: number }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])

  const remainingMs = Math.max(0, closesAtMs - now)
  const remainingSec = (remainingMs / 1000).toFixed(1)

  return (
    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center">
      <p className="text-xs uppercase tracking-widest text-emerald-400/80">
        Hora de apostar
      </p>
      <p
        className="text-2xl font-semibold tabular-nums text-emerald-300"
        aria-live="polite"
      >
        {remainingSec}s
      </p>
    </div>
  )
}

export function BetForm() {
  const auth = useAuth()
  const qc = useQueryClient()
  const phase = useGameStore((s) => s.phase)
  const multiplier = useGameStore((s) => s.multiplier)
  const bettingClosesAtMs = useGameStore((s) => s.bettingClosesAtMs)
  const roundId = useGameStore((s) => s.roundId)
  const myBetId = useGameStore((s) => s.myBetId)
  const myBetRoundId = useGameStore((s) => s.myBetRoundId)
  const setMyBet = useGameStore((s) => s.setMyBet)
  const clearMyBet = useGameStore((s) => s.clearMyBet)

  const [input, setInput] = useState('10,00')

  const placeMutation = useMutation<PlaceBetResponseDto, GamesApiError>({
    mutationFn: async () => {
      const token = auth.user?.access_token
      if (!token) throw new GamesApiError('Missing access token.', 401)
      const cents = brlInputToCents(input)
      if (cents === null) throw new GamesApiError('Invalid amount.', 400)
      if (cents < MIN_BET_CENTS || cents > MAX_BET_CENTS) {
        throw new GamesApiError('Aposta entre R$ 1,00 e R$ 1.000,00.', 422)
      }
      return placeBet(token, cents.toString())
    },
    onSuccess: (data) => {
      setMyBet(data.bet.id)
      qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
      toast.success('Aposta aceita', {
        description: `Você apostou ${centsToBRL(data.bet.stakedAmountCents)}.`,
      })
    },
    onError: (err) => {
      toast.error('Falha na aposta', { description: err.message })
    },
  })

  const cashoutMutation = useMutation<CashoutResponseDto, GamesApiError>({
    mutationFn: async () => {
      const token = auth.user?.access_token
      if (!token) throw new GamesApiError('Missing access token.', 401)
      return cashoutApi(token)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
      clearMyBet()
      toast.success('Cashout realizado', {
        description: `Você ganhou ${centsToBRL(data.netProfitCents)} líquidos.`,
      })
    },
    onError: (err) => {
      toast.error('Falha no cashout', { description: err.message })
    },
  })

  const hasPendingBet = myBetId !== null && myBetRoundId === roundId
  const canBet = auth.isAuthenticated && phase === 'betting_open' && !hasPendingBet && !placeMutation.isPending
  const canCashout =
    auth.isAuthenticated &&
    phase === 'running' &&
    hasPendingBet &&
    !cashoutMutation.isPending

  const projectedPayout = (() => {
    const cents = brlInputToCents(input)
    if (cents === null) return 0n
    return (cents * BigInt(Math.max(100, Math.floor(multiplier * 100)))) / 100n
  })()

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
          Aposta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === 'betting_open' && bettingClosesAtMs !== null && (
          <BettingCountdown closesAtMs={bettingClosesAtMs} />
        )}

        <div className="space-y-2">
          <Label htmlFor="bet-amount">Valor</Label>
          <Input
            id="bet-amount"
            type="text"
            inputMode="decimal"
            value={input}
            disabled={!canBet}
            onChange={(e) => setInput(e.target.value)}
            placeholder="10,00"
            className="tabular-nums"
          />
          <p className="text-xs text-muted-foreground">
            Entre R$ 1,00 e R$ 1.000,00.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!canBet}
            onClick={() => placeMutation.mutate()}
          >
            Apostar
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40"
            disabled={!canCashout}
            onClick={() => cashoutMutation.mutate()}
          >
            {hasPendingBet && phase === 'running'
              ? `Retirar ${centsToBRL(projectedPayout)}`
              : 'Retirar'}
          </Button>
        </div>

        {!auth.isAuthenticated && (
          <p className="text-xs text-amber-400">
            Entre para apostar. Espectadores só visualizam o jogo.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
