import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from 'react-oidc-context'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const auth = useAuth()

  const primaryCta = auth.isAuthenticated
    ? { to: '/game', label: 'Jogar agora' }
    : { to: '/register', label: 'Criar conta grátis' }
  const secondaryCta = auth.isAuthenticated
    ? { to: '/best-players', label: 'Ver Best Players' }
    : { to: '/login', label: 'Já tenho conta' }

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.18),transparent_55%)]"
      />

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-16 pt-20 text-center md:pt-28">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
          Provably fair • Multiplayer ao vivo
        </span>

        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
          Aposte. Multiplique. <span className="text-emerald-400">Retire antes do crash.</span>
        </h1>

        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          O Crash Game da Jungle Gaming é o cassino em tempo real mais rápido que você já viu.
          A curva sobe, você decide quando sacar — e se o foguete explodir antes, perde tudo.
          Transparência total via <strong className="text-foreground">provably fair</strong>:
          cada rodada é auditável.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="h-11 px-6 text-base" asChild>
            <Link to={primaryCta.to}>{primaryCta.label}</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 px-6 text-base" asChild>
            <Link to={secondaryCta.to}>{secondaryCta.label}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-6 text-left md:gap-12">
          <Stat value="R$ 500" label="Saldo inicial grátis" />
          <Stat value="100ms" label="Ticks de multiplicador" />
          <Stat value="∞" label="Teto do multiplicador" />
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-20 md:grid-cols-3">
        <Feature
          title="Aposte em tempo real"
          description="Apostas abertas a cada rodada — feche sua posição com um clique antes da curva crashar."
          icon="⚡"
        />
        <Feature
          title="100% provably fair"
          description="Semente do servidor comprometida via hash antes da rodada. Revelada depois do crash para auditoria."
          icon="🔒"
        />
        <Feature
          title="Carteira integrada"
          description="Saldo em BIGINT de centavos, sem ponto flutuante. Depósito, saque, reserva — tudo em tempo real."
          icon="💰"
        />
      </section>

      <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-card/60 px-6 py-10 text-center backdrop-blur md:px-12">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">
          Pronto pra acompanhar os melhores?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Confira o ranking dos jogadores que mais lucraram e veja se consegue entrar no topo.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-11 px-6 text-base" asChild>
            <Link to="/best-players">Ver ranking</Link>
          </Button>
          <Button size="lg" variant="ghost" className="h-11 px-6 text-base" asChild>
            <Link to="/game">Entrar no jogo</Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-xs text-muted-foreground">
        Jogue com responsabilidade. Este é um desafio técnico da Jungle Gaming — sem dinheiro real.
      </footer>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-heading text-2xl font-bold text-foreground md:text-3xl">{value}</span>
      <span className="text-xs text-muted-foreground md:text-sm">{label}</span>
    </div>
  )
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur transition hover:border-primary/40 hover:bg-card">
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
