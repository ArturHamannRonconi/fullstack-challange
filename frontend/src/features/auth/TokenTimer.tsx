import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type TokenTimerProps = {
  label: string
  expiresAtMs: number
  issuedAtMs: number
}

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export function TokenTimer({ label, expiresAtMs, issuedAtMs }: TokenTimerProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const remainingMs = expiresAtMs - now
  const totalMs = Math.max(1, expiresAtMs - issuedAtMs)
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))
  const expired = remainingMs <= 0

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            'font-mono text-lg tabular-nums',
            expired ? 'text-destructive' : 'text-foreground',
          )}
        >
          {expired ? 'Expirado' : formatMmSs(remainingMs / 1000)}
        </span>
      </div>
      <Progress
        value={pct}
        className={cn(expired && '[&>[data-slot=progress-indicator]]:bg-destructive')}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Emitido: {new Date(issuedAtMs).toLocaleTimeString()}</span>
        <span>Expira: {new Date(expiresAtMs).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
