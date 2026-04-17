import { Wallet as WalletIcon, Lock, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { centsToBRL } from '@/lib/money'
import { cn } from '@/lib/utils'

interface BalanceCardProps {
  balanceCents: string
  availableCents: string
  reservedCents: string
  className?: string
}

export function BalanceCard({
  balanceCents,
  availableCents,
  reservedCents,
  className,
}: BalanceCardProps) {
  return (
    <Card className={cn('border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
          Saldo total
        </CardTitle>
        <WalletIcon className="size-4 text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="font-heading text-4xl font-semibold tracking-tight text-primary drop-shadow-[0_0_12px_rgba(99,102,241,0.35)] tabular-nums"
          aria-live="polite"
        >
          {centsToBRL(balanceCents)}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md bg-background/40 p-3 ring-1 ring-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="size-3.5" />
              Disponível
            </div>
            <div className="mt-1 font-medium text-emerald-400 tabular-nums">
              {centsToBRL(availableCents)}
            </div>
          </div>
          <div className="rounded-md bg-background/40 p-3 ring-1 ring-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="size-3.5" />
              Reservado
            </div>
            <div className="mt-1 font-medium text-amber-400 tabular-nums">
              {centsToBRL(reservedCents)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
