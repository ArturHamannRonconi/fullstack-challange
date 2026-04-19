# Crash Game — Desafio Fullstack

Crash Game multiplayer em tempo real desenvolvido como desafio técnico para a Jungle Gaming. Monorepo com três microserviços NestJS, frontend Vite/React e infraestrutura completa via Docker Compose.

## Visão Geral da Arquitetura

```
Frontend (React 19 + Vite)
        ↓
Kong API Gateway :8000
   ├─ /games/*    → Serviço Games       :4001
   ├─ /wallets/*  → Serviço Wallets     :4002
   └─ /ws/*       → Serviço WebSockets  :4003
        ↓
PostgreSQL · Redis · RabbitMQ · Keycloak
```

Os serviços se comunicam **assincronamente via RabbitMQ**. O frontend nunca fala diretamente com um serviço — sempre passa pelo Kong.

## Serviços

### Games (`services/games`)
Ciclo de vida das rodadas e lógica de apostas. Gerencia os agregados `Round` e `Bet`, calcula o ponto de crash com o algoritmo provably-fair (cadeia de hashes HMAC-SHA256) e coordena operações de carteira via broker.

**Principais endpoints:**
- `GET  /games/rounds/current` — estado da rodada ativa
- `POST /games/bet` — realizar uma aposta (reserva saldo via RPC no RabbitMQ)
- `POST /games/bet/cashout` — sacar no multiplicador atual
- `GET  /games/rounds/:id/verify` — dados para verificação provably-fair

### Wallets (`services/wallets`)
Gerenciamento de saldo dos jogadores. Todos os valores são armazenados como **`BIGINT` em centavos** — nunca ponto flutuante. Expõe operações de reserva/liquidação consumidas pelo serviço Games.

**Principais endpoints:**
- `POST   /wallets` — criar carteira (saldo inicial R$ 500,00)
- `GET    /wallets/me` — saldo atual
- `PATCH  /wallets/deposit` — depositar fundos
- `PATCH  /wallets/withdraw` — sacar fundos disponíveis

### WebSockets (`services/websockets`)
Gateway de tempo real e orquestrador do loop do jogo. Executa o loop de tick (a cada 100 ms), transmite eventos para todos os clientes conectados via socket.io e mantém o estado da rodada no Redis.

**Eventos emitidos aos clientes (server → client, em ordem de ocorrência):**

Todos os eventos são unidirecionais — o servidor emite, o frontend apenas escuta. Ações do jogador (apostar, sacar) são feitas via HTTP REST.

| # | Evento | Payload | Quando |
|---|---|---|---|
| 1 | `round:preparing` | `{}` | Início da preparação; nenhuma aposta aceita ainda |
| 2 | `round:start` | `{ roundId, seedHash }` | Rodada criada; hash do seed comprometido revelado |
| 3 | `round:betting_open` | `{ closesAtMs }` | Janela de apostas aberta; `closesAtMs` é epoch ms do fechamento |
| 4 | `round:bet` | `{ roundId, playerId, username?, stakedAmount }` | Um jogador realizou uma aposta (broadcast para todos) |
| 5 | `round:betting_closed` | `{}` | Janela de apostas encerrada; novas apostas rejeitadas |
| 6 | `round:game_start` | `{}` | Loop do jogo iniciado; multiplicador começa a subir |
| 7 | `round:game_tick` | `{ multiplier }` | Atualização do multiplicador a cada 100 ms |
| 8 | `round:cash_out` | `{ roundId, playerId, username?, multiplier }` | Um jogador sacou no multiplicador indicado |
| 9 | `round:crashed` | `{ crashPoint }` | Jogo encerrado; `crashPoint` é o multiplicador final |

## Pacotes Compartilhados

| Pacote | Finalidade |
|---|---|
| `@crash/domain` | `MoneyValueObject` — aritmética imutável com bigint |
| `@crash/auth` | Verificação de JWT via JWKS do Keycloak (RS256) |
| `@crash/events` | Contratos de eventos RabbitMQ e WebSocket |
| `@crash/provably-fair` | `computeCrashPoint(serverSeed, clientSeed, nonce)` |
| `@crash/real-time-db` | Store de estado da rodada no Redis |
| `@crash/utils` | Formatadores e utilitários compartilhados |

## Frontend (`frontend/`)

React 19 + TanStack Query + Zustand + Tailwind v4.

- **Auth** — OIDC Authorization Code + PKCE via Keycloak (`oidc-client-ts`)
- **Tela do jogo** — Gráfico de crash em Canvas, formulário de aposta, lista de apostas ao vivo, histórico de rodadas
- **Tela da carteira** — Exibição de saldo, formulários de depósito/saque
- **Verificador** — `/verify/:roundId` — reproduz o ponto de crash a partir das seeds
- **Placar** — Melhores jogadores por lucro

Divisão de estado: TanStack Query para dados do servidor (carteira, histórico), Zustand para estado do jogo em tempo real (multiplicador, fase da rodada, contagem regressiva).

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Runtime | Bun 1.x |
| Backend | NestJS 11 · TypeScript 5.8 strict |
| Banco de dados | PostgreSQL 18 via Prisma |
| Cache | Redis 7.4 |
| Mensageria | RabbitMQ 4.2 |
| API Gateway | Kong 3.9 (declarativo) |
| Identidade | Keycloak 26 (OIDC PKCE) |
| WebSocket | socket.io |
| Base DDD | `ddd-tool-kit` |
| Frontend | Vite 6 · React 19 · TanStack Query · Zustand |

## Início Rápido

```bash
# Instalar dependências (raiz do monorepo)
bun install

# Subir tudo (infra + serviços + frontend)
bun run docker:up

# Parar
bun run docker:down

# Reset completo (remove volumes e imagens)
bun run docker:prune
```

O `docker:up` faz o build das imagens, executa as migrations, importa o realm do Keycloak e sobe todos os serviços — sem passos manuais.

## Desenvolvimento

```bash
# Rodar um serviço em modo watch
cd services/games      && bun run dev
cd services/wallets    && bun run dev
cd services/websockets && bun run dev

# Dev server do frontend (porta 5173)
cd frontend && bun run dev
```

## Testes

```bash
# Testes unitários de todos os pacotes
bun run test:unit

# Testes unitários de um serviço específico
cd services/games   && bun test
cd services/wallets && bun test

# E2E (requer docker:up)
cd services/games   && bun test:e2e
cd services/wallets && bun test:e2e

# Browser / Playwright
bun run test:browser
```

## Portas e Credenciais

| Serviço | URL | Credenciais |
|---|---|---|
| Kong (API) | `http://localhost:8000` | — |
| Frontend | `http://localhost:3000` | — |
| Keycloak | `http://localhost:8080` | `admin` / `admin` |
| RabbitMQ UI | `http://localhost:15672` | `admin` / `admin` |
| PostgreSQL | `localhost:5432` | bancos: `games`, `wallets` |

**Usuário de teste:** `player` / `player123` (realm `crash-game`)

## Decisões de Design

**Dinheiro sempre em `BIGINT` centavos.** O `MoneyValueObject` encapsula toda a aritmética e impede que ponto flutuante toque em valores financeiros. Pagamentos de cashout truncam (floor), nunca arredondam.

**Consumers idempotentes.** O RabbitMQ entrega at-least-once. Cada consumer usa uma tabela inbox + `messageId` para garantir processamento exactly-once.

**Loop de jogo único.** Apenas o serviço WebSockets executa o ticker. Em escala horizontal, um lock no Redis garante um único orquestrador ativo.

**Validação de JWT por serviço.** Cada serviço NestJS busca o endpoint JWKS do Keycloak de forma independente e verifica tokens RS256 — sem segredo compartilhado.

**Camadas DDD respeitadas.** `domain → application → infrastructure → presentation`. A camada de domínio não possui dependências externas.
