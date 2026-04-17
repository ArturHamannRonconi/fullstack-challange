import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { centsToBRL, brlInputToCents } from '@/lib/money'
import { cn } from '@/lib/utils'

const MIN_CENTS = 100n
const MAX_CENTS = 100_000n

interface AmountFormProps {
  title: string
  submitLabel: string
  variant: 'deposit' | 'withdraw'
  availableCents?: string
  onSubmit: (amountCents: string) => Promise<void>
  pending: boolean
}

export function AmountForm({
  title,
  submitLabel,
  variant,
  availableCents,
  onSubmit,
  pending,
}: AmountFormProps) {
  const [raw, setRaw] = useState('')
  const parsed = useMemo(() => (raw.trim() ? brlInputToCents(raw) : null), [raw])

  const available = availableCents ? BigInt(availableCents) : null
  const isWithdraw = variant === 'withdraw'
  const exceedsAvailable =
    isWithdraw && parsed !== null && available !== null && parsed > available

  const outOfRange =
    parsed !== null && (parsed < MIN_CENTS || parsed > MAX_CENTS)

  const disabled =
    pending || parsed === null || outOfRange || (isWithdraw && exceedsAvailable)

  const helperText =
    parsed === null && raw.trim()
      ? 'Valor inválido. Use o formato 10,00.'
      : outOfRange
        ? 'Valor deve estar entre R$ 1,00 e R$ 1.000,00.'
        : exceedsAvailable
          ? `Máximo disponível: ${centsToBRL(available ?? 0n)}.`
          : 'Mínimo R$ 1,00 · Máximo R$ 1.000,00.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled || parsed === null) return

    try {
      await onSubmit(parsed.toString())
      setRaw('')
      toast.success(
        isWithdraw ? 'Saque realizado.' : 'Depósito realizado.',
        { description: centsToBRL(parsed) },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido.'
      toast.error(
        isWithdraw ? 'Falha no saque' : 'Falha no depósito',
        { description: message },
      )
    }
  }

  const quickValues = isWithdraw ? [10, 50, 100, 500] : [10, 50, 100, 500]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="space-y-1">
        <Label htmlFor={`${variant}-amount`} className="text-xs uppercase tracking-wide text-muted-foreground">
          {title}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">R$</span>
          <Input
            id={`${variant}-amount`}
            inputMode="decimal"
            placeholder="0,00"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-invalid={parsed !== null && (outOfRange || exceedsAvailable) ? true : undefined}
            disabled={pending}
            autoComplete="off"
          />
        </div>
        <p
          className={cn(
            'text-xs',
            parsed !== null && (outOfRange || exceedsAvailable)
              ? 'text-destructive'
              : 'text-muted-foreground',
          )}
        >
          {helperText}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickValues.map((v) => (
          <Button
            key={v}
            type="button"
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() => setRaw(v.toFixed(2).replace('.', ','))}
          >
            R$ {v}
          </Button>
        ))}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={disabled}
        variant={isWithdraw ? 'outline' : 'default'}
        className={cn(
          isWithdraw
            ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
            : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400',
        )}
      >
        {pending ? 'Processando…' : submitLabel}
      </Button>
    </form>
  )
}
