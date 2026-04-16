import { createFileRoute } from '@tanstack/react-router'
import { ServiceBadge } from '@/features/health/ServiceBadge'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-semibold">Crash Game</h1>
      <div className="flex flex-wrap items-center gap-4">
        <ServiceBadge name="games" />
        <ServiceBadge name="wallets" />
      </div>
    </main>
  )
}
