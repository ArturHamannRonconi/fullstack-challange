import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api'
import { cn } from '@/lib/utils'

type ServiceName = 'games' | 'wallets'

export function ServiceBadge({ name }: { name: ServiceName }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health', name],
    queryFn: () => fetch(`${API_BASE_URL}/${name}/health`).then((r) => r.ok),
    refetchInterval: 3000,
    retry: false,
    staleTime: 0,
  })

  const status: 'pending' | 'up' | 'down' = isPending
    ? 'pending'
    : isError || data !== true
      ? 'down'
      : 'up'

  const label =
    status === 'up' ? 'operacional' : status === 'down' ? 'fora do ar' : 'verificando'

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-2.5 w-2.5 rounded-full',
          status === 'up' && 'bg-emerald-500',
          status === 'down' && 'bg-red-500',
          status === 'pending' && 'animate-pulse bg-zinc-400',
        )}
      />
      <span className="font-medium capitalize">{name}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}
