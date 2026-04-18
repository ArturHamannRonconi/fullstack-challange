import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getRoundsHistory } from './api'
import { useGameStore } from './store'

function short(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function RoundHistory() {
  const liveHistory = useGameStore((s) => s.history)
  const seedHistory = useGameStore((s) => s.seedHistory)

  const { data } = useQuery({
    queryKey: ['game', 'rounds-history'],
    queryFn: () => getRoundsHistory(20),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!data) return
    const points = data.items
      .filter((r) => r.currentStatus === 'CRASHED')
      .map((r) => r.crashPointScaled / 100)
    if (points.length > 0) seedHistory(points)
  }, [data, seedHistory])

  const apiItems = data
    ? data.items
        .filter((r) => r.currentStatus === 'CRASHED')
        .map((r) => ({ roundId: r.id, point: r.crashPointScaled / 100, seedHash: r.seedHash }))
    : []
  const liveItems = liveHistory.map((point) => ({ roundId: null, point, seedHash: null }))
  const items = apiItems.length > 0 ? apiItems : liveItems

  return (
    <Card className="border-border bg-background/60">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Sem rodadas anteriores.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {items.map((item, i) => {
              const colorClass = item.point >= 2
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
              const label = `${item.point.toFixed(2)}x`

              const inner = (
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-semibold tabular-nums">{label}</span>
                  {item.seedHash && (
                    <span className="font-mono text-[0.55rem] opacity-60">
                      {short(item.seedHash)}
                    </span>
                  )}
                </span>
              )

              return (
                <li key={`${item.roundId ?? 'live'}-${i}`}>
                  {item.roundId ? (
                    <Link
                      to="/verify/$roundId"
                      params={{ roundId: item.roundId }}
                      className={cn(
                        'flex rounded-md border px-2 py-1 transition-colors hover:brightness-125',
                        colorClass,
                      )}
                      title={`Verificar round ${item.roundId}\nHash: ${item.seedHash ?? '—'}`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <span className={cn('flex rounded-md border px-2 py-1', colorClass)}>
                      {inner}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
