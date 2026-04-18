import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGameStore } from '@/features/game/store'

export const Route = createFileRoute('/verify/')({
  component: VerifyIndexPage,
})

function VerifyIndexPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const lastRoundId = useGameStore((s) => s.lastCrashedRoundId ?? s.roundId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = inputRef.current?.value.trim()
    if (value) {
      void navigate({ to: '/verify/$roundId', params: { roundId: value } })
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-60px)] max-w-3xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verificação Provably Fair</h1>
        <p className="text-sm text-muted-foreground">
          Insira o ID de um round finalizado para verificar sua integridade.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Verificar round
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              defaultValue={lastRoundId ?? ''}
              placeholder="ID do round"
              className="flex-1 rounded-md border border-border bg-background/60 px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="submit" size="sm">
              Verificar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            O ID do round aparece no card <span className="font-semibold text-foreground">Provably Fair</span> durante e após cada partida.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
