# CLAUDE.md — Raiz do monorepo

Desafio técnico da **Jungle Gaming**: um Crash Game multiplayer em tempo real. Monorepo Bun workspaces com dois microserviços NestJS (`games`, `wallets`), frontend Vite/React e infra via Docker Compose.

Para detalhes funcionais do desafio, leia `README.md`. Este arquivo captura convenções e decisões operacionais que o `README.md` não cobre.

## Plano de entrega

- `prompts/prompt-1/output.md` — plano detalhado por **dias do calendário** (aprendizado → planejamento → execução).
- `prompts/prompt-2/output.md` — plano por **milestones incrementais** (M0 → M8), cada um entregando demo testável end-to-end. **É a ordem de execução canônica**; siga-a em vez de inventar sequências novas.

Antes de alterar regra de negócio, cheque em qual milestone ela cai e respeite o gate de saída descrito.

## Workspace layout

```
services/games/    → NestJS — round lifecycle, bets, WS gateway, provably fair
services/wallets/  → NestJS — balance, reserve/debit/credit via broker
packages/*         → código compartilhado entre services (e frontend onde aplicável)
frontend/          → Vite + React 19 + TanStack Query + Zustand + Tailwind v4
docker/            → kong.yml, realm-export.json (Keycloak), init-databases.sh
```

Bun workspaces: `services/*`, `packages/*`, `frontend`. Instalação só na raiz (`bun install`).

## Comandos essenciais

```bash
bun install                 # instala tudo (monorepo)
bun run docker:up           # sobe infra + serviços + frontend
bun run docker:down         # para containers
bun run docker:prune        # limpa tudo (volumes, imagens)

cd services/games   && bun run dev        # dev com watch
cd services/games   && bun test           # unit
cd services/games   && bun test:e2e       # e2e (requer docker:up)
cd frontend         && bun run dev        # Vite em :5173
```

Critério eliminatório: `bun run docker:up` deve subir tudo **sem passos manuais**. Se você adicionar dependências ou configs, garanta que sobem via compose.

## Portas e roteamento

| Serviço    | Direto         | Via Kong                             |
|------------|---------------|--------------------------------------|
| games      | `:4001`       | `http://localhost:8000/games/*`      |
| wallets    | `:4002`       | `http://localhost:8000/wallets/*`    |
| frontend   | `:3000` prod / `:5173` dev | —                       |
| postgres   | `:5432`       | databases: `games`, `wallets`        |
| rabbitmq   | `:5672` AMQP / `:15672` UI (`admin`/`admin`) | —     |
| keycloak   | `:8080`       | realm `crash-game` (`admin`/`admin`) |

**Frontend fala com os serviços sempre via Kong** (`http://localhost:8000`), nunca direto na porta do serviço.

## Identidade (Keycloak)

- Realm: `crash-game` (importado automaticamente via `docker/keycloak/realm-export.json`).
- Client: `crash-game-client` (public, PKCE S256).
- Usuário de teste: `player` / `player123`.
- Discovery: `http://localhost:8080/realms/crash-game/.well-known/openid-configuration`.

Autenticação usa **Authorization Code + PKCE** — o frontend redireciona pro Keycloak, não implementa login próprio.

## Regras invioláveis

1. **Dinheiro nunca em ponto flutuante.** Use `BIGINT` em centavos (Value Object `Money` compartilhado). Multiplicador também é inteiro escalado (× 10⁴).
2. **Idempotência obrigatória** em consumers do broker. RabbitMQ é at-least-once; duplicatas vão acontecer. Use `messageId` + tabela `inbox` (ou checar estado antes de aplicar).
3. **TypeScript strict mode** já configurado nos tsconfigs. Não afrouxe `strict`, `noImplicitAny`, `strictNullChecks`.
4. **DDD layering**: `domain → application → infrastructure → presentation`. Domain não importa de fora; application orquestra; infrastructure fala com banco/broker; presentation expõe HTTP/WS.
5. **Cliente nunca dita multiplicador nem crash point.** O servidor é a única fonte da verdade — o frontend só exibe o que recebeu via WS.
6. **Backend valida JWTs** via JWKS do Keycloak (não segredo compartilhado). Cada serviço confere o `sub` nos use cases.
7. **Commits atômicos e convencionais** (`feat(m3): ...`, `fix(wallets): ...`). Commit history pesa 10% da avaliação.

## Comunicação entre serviços

Assíncrona via **RabbitMQ** com `@nestjs/microservices` (`Transport.RMQ`). Escolha intencional — documente no README se trocar por SQS.

Padrões recomendados:
- **Saga com reply queue** (`.send()` RPC) para validar saldo na hora da aposta.
- **Outbox** para publicar eventos na mesma transação do write de domínio (garante at-least-once).
- **Inbox** no consumer para deduplicar (garante exactly-once processing).

O `games` é o **único gateway WS**. `wallets` publica eventos no broker; `games` repassa para os clientes conectados.

## Stack fixo (não substitua sem motivo)

- Runtime: **Bun 1.x**
- Backend: **NestJS 11 + TypeScript strict**
- DB: **PostgreSQL 18** (via ORM — decisão deferida; MikroORM tem melhor ergonomia DDD)
- Broker: **RabbitMQ**
- Gateway: **Kong** (declarativo via `kong.yml`)
- IdP: **Keycloak 26**
- Frontend: **Vite + React 19 + TanStack Query + Zustand + Tailwind v4**
- WS: **socket.io** (reconexão, rooms, adapter Redis se escalar)
- Testes: **Bun test runner**

Libs já instaladas no frontend: `@tanstack/react-query`, `zustand`, `tailwindcss` v4 via plugin Vite. Ainda faltam: `oidc-client-ts`/`react-oidc-context`, `socket.io-client`, `shadcn/ui`, roteador (TanStack Router ou React Router).

## Testes

Cada serviço tem `tests/unit/` e `tests/e2e/`. E2E é **teste de API real** (HTTP + DB + broker reais via testcontainers ou compose dedicado) — não é teste de frontend.

Cobertura obrigatória:
- Unit: ciclo de vida do Round, cálculo de cashout, Wallet (crédito/débito/saldo insuficiente), provably fair (vetores fixos).
- E2E: apostar → cashout → saldo; apostar → crash → perda; erros de validação.

## O que NÃO fazer

- Não adicionar features que não estão no milestone atual. MVP sólido > bônus frágil.
- Não gerar docs/summaries intermediários a menos que o usuário peça.
- Não usar `--no-verify` nem desativar hooks/lint.
- Não modificar `docker-compose.yml` de um jeito que exija passos manuais pra subir.
- Não duplicar regra de negócio entre services — se algo é compartilhado (ex: fórmula provably fair), vai pra `packages/`.

## Onde aprofundar

- `services/games/CLAUDE.md` — regras específicas do domínio de jogo.
- `services/wallets/CLAUDE.md` — regras de carteira, precisão monetária, idempotência.
- `frontend/CLAUDE.md` — convenções de UI, OIDC, WS client.
- `packages/CLAUDE.md` — o que vai em shared, contratos de pureza.
