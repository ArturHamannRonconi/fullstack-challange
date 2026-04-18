import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getCurrentRound } from './api'
import { useGameStore } from './store'

function short(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can fail on non-HTTPS or unsupported browsers — silently ignore.
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="text-[0.65rem] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p
        className="break-all rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[0.7rem] text-foreground/90"
        title={value}
      >
        {short(value, 16, 12)}
      </p>
    </div>
  )
}

export function ProvablyFairCard() {
  const phase = useGameStore((s) => s.phase)
  const roundId = useGameStore((s) => s.roundId)
  const seedHash = useGameStore((s) => s.seedHash)
  const revealedSeed = useGameStore((s) => s.revealedSeed)

  // Fallback: if the store hasn't received the WS event yet, fetch from API.
  const { data: snapshot } = useQuery({
    queryKey: ['game', 'current-round'],
    queryFn: getCurrentRound,
    enabled: !seedHash,
    staleTime: 10_000,
    refetchInterval: seedHash ? false : 5_000,
  })

  const effectiveRoundId = roundId ?? snapshot?.id ?? null
  const effectiveSeedHash = seedHash ?? snapshot?.seedHash ?? null
  const effectiveRevealedSeed = revealedSeed ?? snapshot?.serverSeed ?? null

  const isCrashed = phase === 'crashed' || snapshot?.currentStatus === 'CRASHED'
  const hasHash = Boolean(effectiveSeedHash)

  return (
    <Card className="border-border bg-background/60">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm uppercase tracking-widest text-muted-foreground">
          <span>Provably Fair</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider',
              isCrashed && effectiveRevealedSeed
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400',
            )}
          >
            {isCrashed && effectiveRevealedSeed ? 'REVELADA' : 'COMPROMETIDA'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasHash ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Aguardando próximo round…
          </p>
        ) : (
          <>
            {effectiveRoundId && (
              <CopyField label="Round ID (nonce)" value={effectiveRoundId} />
            )}
            <CopyField label="Seed Hash (commitment)" value={effectiveSeedHash!} />
            {isCrashed && effectiveRevealedSeed && (
              <CopyField label="Server Seed (revelada)" value={effectiveRevealedSeed} />
            )}
            {isCrashed && !effectiveRevealedSeed && (
              <p className="text-[0.7rem] text-muted-foreground">
                Buscando seed revelada…
              </p>
            )}
            <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
              {isCrashed && effectiveRevealedSeed
                ? 'Round encerrado. Confira que SHA-256 da seed bate com o hash acima.'
                : 'Anote o hash agora. Após o crash, a seed será revelada para você verificar que o servidor não a alterou no meio do round.'}
            </p>
            {effectiveRoundId && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/verify/$roundId" params={{ roundId: effectiveRoundId }}>
                  Abrir verificador
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
