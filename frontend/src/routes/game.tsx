import { createFileRoute } from '@tanstack/react-router'

import { BetForm } from '@/features/game/BetForm'
import { BetList } from '@/features/game/BetList'
import { CrashChart } from '@/features/game/CrashChart'
import { ProvablyFairCard } from '@/features/game/ProvablyFairCard'
import { RoundHistory } from '@/features/game/RoundHistory'

export const Route = createFileRoute('/game')({
  component: GamePage,
})

function GamePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-60px)] max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <CrashChart />
          <RoundHistory />
        </div>
        <div className="space-y-4">
          <BetForm />
          <BetList />
          <ProvablyFairCard />
        </div>
      </div>
    </main>
  )
}
