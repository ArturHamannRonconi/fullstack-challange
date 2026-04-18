import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { centsToBRL } from '@/lib/money'
import { useGameStore } from './store'

export function BetList() {
  const bets = useGameStore((s) => s.bets)

  return (
    <Card className="border-border bg-background/60">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
          Apostas na rodada
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-72 overflow-y-auto">
        {bets.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nenhuma aposta ainda.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {bets.map((bet) => (
              <li
                key={bet.id}
                className="flex items-center justify-between rounded-md px-2 py-1 ring-1 ring-border/50"
              >
                <span className="truncate text-muted-foreground">
                  {bet.username ?? bet.playerId.slice(0, 8)}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span>{centsToBRL(bet.stakedAmountCents)}</span>
                  {bet.isCashedOut && bet.cashOutMultiplier != null && (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {bet.cashOutMultiplier.toFixed(2)}x
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
