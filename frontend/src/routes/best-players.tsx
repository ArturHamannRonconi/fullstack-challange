import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GamesApiError, getLeaderboard } from '@/features/game/api'
import type { LeaderboardDto, LeaderboardEntryDto } from '@/features/game/types'
import { centsToBRL } from '@/lib/money'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/best-players')({
  component: BestPlayersPage,
})

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return v
}

function BestPlayersPage() {
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)

  const query = useQuery<LeaderboardDto, GamesApiError>({
    queryKey: ['game', 'leaderboard', debounced],
    queryFn: () => getLeaderboard({ page: 1, perPage: 50, search: debounced }),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Best Players</h1>
        <p className="text-sm text-muted-foreground">
          Ranking dos jogadores com maior lucro acumulado. Atualiza a cada rodada.
        </p>
      </header>

      <div>
        <Input
          placeholder="Buscar por nome de usuário…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Ranking por lucro líquido
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : query.isError ? (
            <p className="py-8 text-center text-sm text-rose-400">
              Falha ao carregar ranking: {query.error.message}
            </p>
          ) : !query.data || query.data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum jogador encontrado.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {query.data.items.map((entry, idx) => (
                <LeaderboardRow key={entry.playerId} rank={idx + 1} entry={entry} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function LeaderboardRow({ rank, entry }: { rank: number; entry: LeaderboardEntryDto }) {
  const profit = BigInt(entry.totalProfitCents)
  const isPositive = profit >= 0n
  const winRate =
    entry.betsCount > 0 ? Math.round((entry.wins / entry.betsCount) * 100) : 0
  const displayName = entry.username ?? shortId(entry.playerId)

  return (
    <li className="flex items-center gap-4 py-3">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
          rank === 1 && 'bg-amber-500/20 text-amber-300',
          rank === 2 && 'bg-slate-300/15 text-slate-200',
          rank === 3 && 'bg-orange-500/20 text-orange-300',
          rank > 3 && 'bg-muted text-muted-foreground',
        )}
      >
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{displayName}</p>
        <p className="text-xs text-muted-foreground">
          {entry.betsCount} {entry.betsCount === 1 ? 'aposta' : 'apostas'} • {entry.wins} vitórias •{' '}
          {entry.losses} derrotas • {winRate}% win rate
        </p>
      </div>

      <div
        className={cn(
          'shrink-0 text-right font-heading text-lg font-semibold tabular-nums',
          isPositive ? 'text-emerald-400' : 'text-rose-400',
        )}
      >
        {isPositive ? '+' : ''}
        {centsToBRL(profit)}
      </div>
    </li>
  )
}

function shortId(playerId: string): string {
  return playerId.length > 10 ? `${playerId.slice(0, 4)}…${playerId.slice(-4)}` : playerId
}
