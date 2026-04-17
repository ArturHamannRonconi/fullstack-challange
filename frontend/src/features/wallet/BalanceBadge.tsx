import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'

import { centsToBRL } from '@/lib/money'
import { useWallet } from './hooks'

export function BalanceBadge() {
  const { data, isLoading, isError } = useWallet()

  if (isLoading || isError || !data) {
    return (
      <Link
        to="/wallet"
        className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-background/80"
      >
        <Wallet className="size-3.5" />
        <span className="tabular-nums">—</span>
      </Link>
    )
  }

  return (
    <Link
      to="/wallet"
      className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-[0_0_12px_rgba(99,102,241,0.15)] transition hover:bg-primary/20"
      aria-label="Abrir carteira"
    >
      <Wallet className="size-3.5" />
      <span className="tabular-nums">{centsToBRL(data.availableCents)}</span>
    </Link>
  )
}
