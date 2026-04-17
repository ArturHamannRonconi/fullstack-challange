import { ArrowDownLeft, ArrowUpRight, Lock, TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { centsToBRL } from '@/lib/money'
import type { OperationDto, OperationType } from './types'

const TYPE_META: Record<
  OperationType,
  { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }
> = {
  DEPOSIT: { label: 'Depósito', tone: 'text-emerald-400', icon: ArrowDownLeft },
  WITHDRAW: { label: 'Saque', tone: 'text-amber-400', icon: ArrowUpRight },
  RESERVE: { label: 'Reserva', tone: 'text-sky-400', icon: Lock },
  WIN: { label: 'Ganho', tone: 'text-emerald-400', icon: TrendingUp },
  LOST: { label: 'Perda', tone: 'text-rose-400', icon: TrendingDown },
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function OperationHistory({ operations }: { operations: OperationDto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de atividades</CardTitle>
        <CardDescription>
          {operations.length === 0
            ? 'Nenhuma operação registrada ainda.'
            : `${operations.length} ${operations.length === 1 ? 'operação' : 'operações'}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Faça um depósito ou saque para começar.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {operations.map((op) => {
              const meta = TYPE_META[op.type]
              const Icon = meta.icon
              const isCredit = op.type === 'DEPOSIT' || op.type === 'WIN'
              return (
                <li
                  key={op.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
                >
                  <span className={`flex size-8 items-center justify-center rounded-full bg-background/50 ring-1 ring-border ${meta.tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{formatWhen(op.createdAt)}</div>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums ${meta.tone}`}>
                    {isCredit ? '+' : '−'} {centsToBRL(op.amountCents)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
