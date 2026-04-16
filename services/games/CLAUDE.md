# CLAUDE.md — `services/games`

Bounded context do **ciclo de vida do jogo**: rodadas, apostas, cashout, crash, provably fair, WebSocket gateway.

Convenções gerais do monorepo estão em `../../CLAUDE.md`. Aqui ficam só as regras específicas deste serviço.

## Escopo e não-escopo

**Faz aqui:**
- Gerenciar o agregado `Round` (estado: `BETTING_OPEN` → `RUNNING` → `CRASHED` → pausa → próxima).
- Receber `PlaceBet` e `Cashout` via REST.
- Calcular crash point com algoritmo provably fair auditável.
- Publicar eventos para `wallets` (reserva/débito/crédito) via RabbitMQ.
- Emitir eventos WS para todos os clientes (o único gateway WS do sistema).

**Não faz:**
- Não guarda saldo. Sempre delega para `wallets` via broker.
- Não valida senha/registro — só confia no JWT emitido pelo Keycloak.
- Não expõe crédito/débito via REST (responsabilidade do `wallets`, e mesmo lá só internamente via broker).

## Estrutura DDD

```
src/
├── main.ts                 → bootstrap
├── app.module.ts           → wiring
├── domain/                 → agregados, VOs, eventos de domínio, regras puras
├── application/            → use cases, sagas, command/query handlers
├── infrastructure/         → ORM repos, RabbitMQ clients, WS gateway impl, HTTP clients
└── presentation/           → controllers REST, DTOs, WS gateway (@WebSocketGateway)
    ├── controllers/
    └── dtos/
```

Regras de dependência:
- `domain/` **não importa** de `application/`, `infrastructure/` ou `presentation/`. Nem NestJS.
- `application/` pode importar `domain/` e interfaces de repo/broker definidas em `domain/`.
- `infrastructure/` implementa essas interfaces. ORM, AMQP, socket.io moram aqui.
- `presentation/` só traduz request → command de application e event de domínio → payload WS.

## Agregados e Value Objects (a modelar)

- **`Round`** (aggregate root) — ciclo de vida do jogo. Campos: `id`, `status`, `serverSeed` (privado até reveal), `serverSeedHash`, `clientSeed`, `nonce`, `crashPointScaled`, `startedAt`, `crashedAt`. Invariantes: só aceita `Bet` em `BETTING_OPEN`; `crashPoint` é determinado antes da rodada iniciar.
- **`Bet`** (aggregate) — aposta de um player. Campos: `id`, `roundId`, `userId`, `amountCents` (BIGINT), `autoCashoutScaled?`, `cashedOutAtScaled?`, `status` (`RESERVED`/`CASHED_OUT`/`LOST`). Uma bet por player por round.
- **VOs**: `CrashPoint` (inteiro escalado × 10⁴), `Multiplier` (idem), `ServerSeed`, `ClientSeed`, `Nonce`. **Money fica em `packages/`** (compartilhado com `wallets`).

## Game loop

Implementar como provider singleton iniciado em `onModuleInit` (não confundir com rodar a cada request — é um loop contínuo do processo).

Estados e durações (configurável via env):
- `BETTING_OPEN` — 5s (default) — aceita bets.
- `RUNNING` — multiplicador sobe continuamente (fórmula recomendada: `m = e^(0.00006 * elapsedMs)`). Emite `round.tick` a cada 100ms com multiplicador escalado.
- `CRASHED` — quando `m >= crashPoint`, para. Revela `serverSeed`.
- Pausa de ~3s → próxima rodada.

**Cuidados:**
- **Single instance do loop.** Se escalar horizontalmente, apenas 1 worker roda o loop (lock distribuído Redis ou worker dedicado). Instâncias extras só repassam WS.
- **Throttle do tick** (100ms é suficiente; 60fps é excesso). Cache o JSON do payload (é igual pra todos).
- **Nunca confiar** em timestamp/multiplicador vindo do cliente.

## Provably Fair

Implementação de referência: **Bustabit-style** (HMAC-SHA256 + house edge 1/33). Detalhes conceituais em `prompts/prompt-1/output.md §1.6`.

Regras:
1. No boot, se não houver hash chain persistida, gere N=10.000 seeds: `seed[i] = sha256(seed[i+1])`. Persiste `seed[0]` (hash raiz) como commitment público.
2. Rodada `i` usa `serverSeed = seed[N-i-1]`, `clientSeed` público (hash de bloco Bitcoin recente ou string fixa do operador), `nonce = roundId`.
3. Antes de `RUNNING`, emitir `serverSeedHash`. Depois de `CRASHED`, revelar `serverSeed`.
4. Função de cálculo **é pura e vive em `packages/`** — frontend usa a mesma função pra verificar.
5. **Testes com vetores fixos** (entrada conhecida → crash point esperado). Escreva antes de implementar.

Campos do Round devem permitir verificação posterior: `serverSeed`, `clientSeed`, `nonce`, `crashPointScaled`.

## REST endpoints (expostos via Kong em `/games/*`)

| Método | Path                           | Auth | Lógica                                             |
|--------|--------------------------------|------|---------------------------------------------------|
| GET    | `/rounds/current`              | ❌   | Estado da rodada atual + apostas                  |
| GET    | `/rounds/history`              | ❌   | Paginado; últimas N rodadas com crash point       |
| GET    | `/rounds/:roundId/verify`      | ❌   | Dados para verificação provably fair              |
| GET    | `/bets/me`                     | ✅   | Apostas do usuário (paginado)                     |
| POST   | `/bet`                         | ✅   | Criar aposta (saga com `wallets.reserve`)         |
| POST   | `/bet/cashout`                 | ✅   | Sacar na rodada atual                             |

DTOs em `presentation/dtos/`. Valide com `class-validator` ou `zod`. Rejeite `bet` fora de `BETTING_OPEN` e `cashout` fora de `RUNNING`.

## WebSocket gateway

Namespace: `/game`. Autentica JWT no handshake via `io.use` com JWKS do Keycloak. Sem token → rejeita.

Eventos **emitidos** (server → client):

| Evento              | Payload (resumo)                                             | Quando                       |
|---------------------|--------------------------------------------------------------|------------------------------|
| `round.started`     | `{ roundId, serverSeedHash, startsAtMs }`                    | Transição para BETTING_OPEN  |
| `round.bettingOpen` | `{ roundId, closesAtMs }`                                    | Fase de apostas              |
| `round.running`     | `{ roundId, startedAtMs }`                                   | Multiplicador começa         |
| `round.tick`        | `{ roundId, multiplierScaled }`                              | A cada 100ms em RUNNING      |
| `round.crashed`     | `{ roundId, crashPointScaled, serverSeed, clientSeed, nonce }` | Ao crashar                 |
| `bet.placed`        | `{ roundId, betId, userId, username, amountCents }`          | Outra aposta foi confirmada  |
| `bet.cashedOut`     | `{ roundId, betId, userId, username, payoutCents, atScaled }` | Outro cashout              |
| `bet.lost`          | `{ roundId, betId, userId }`                                 | Bet perdida no crash         |
| `wallet.updated`    | `{ userId, balanceCents, availableCents, reservedCents }`    | Fan-out de eventos do `wallets` |

Não há eventos client → server para gameplay (apostar/cashout são REST). O WS é **push only**.

## Saga de aposta (RPC com wallets)

1. `POST /bet` valida `BETTING_OPEN`.
2. `games` envia `wallets.reserve { userId, amountCents, messageId: uuid() }` via `.send()` (reply queue).
3. Aguarda reply com timeout (2s). Possíveis respostas:
   - `FundsReserved` → persiste `Bet(status=RESERVED)` + emite `bet.placed` WS → `201`.
   - `InsufficientFunds` → `400`.
   - Timeout → `504` + compensação (emitir release se reserve eventualmente chegar).
4. No `CRASHED`:
   - Para cada `Bet RESERVED` sem cashout: publica `wallets.debit` (consome reserva = vira lucro da casa) → emite `bet.lost` WS.
5. No `cashout`:
   - Calcula `payoutCents = bet.amountCents * currentMultiplierScaled / 10000` (inteiro, trunca a favor da casa).
   - Publica `wallets.credit { userId, amountCents: payoutCents, sourceReservationId: bet.id, messageId }`.
   - Atualiza `Bet(status=CASHED_OUT, cashedOutAtScaled)`.
   - Emite `bet.cashedOut` WS.

Todo publish no broker deve passar pela **outbox** (mesma transação do write do Bet/Round).

## Padrões obrigatórios

- **Outbox table** (`outbox`): `id`, `aggregateType`, `aggregateId`, `eventType`, `payload`, `occurredAt`, `publishedAt?`. Worker `OutboxPublisher` publica pendentes a cada 500ms.
- **Inbox table** (`inbox`): `messageId`, `processedAt`. Consumers conferem antes de processar.
- **Transações explícitas** ao manipular `Round` + `Outbox` juntos.
- **Logs estruturados** (JSON) com `roundId`, `userId`, `messageId` quando aplicável.

## Env vars (ver `.env.example`)

- `PORT=4001`
- `DATABASE_URL=postgresql://admin:admin@postgres:5432/games`
- `RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672`
- Provavelmente adicionar: `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URI`, `GAME_BETTING_WINDOW_MS`, `GAME_PAUSE_MS`.

## Testes

```bash
bun test          # tests/unit — domain puro (Round, Bet, provably fair)
bun run test:e2e  # tests/e2e — requer docker:up ou testcontainers
```

Unit obrigatórios:
- Round: transições válidas e inválidas; não aceita bet fora de BETTING_OPEN; crashPoint determina fim.
- Bet: cálculo de payout com arredondamento truncado; validação de valor mín/máx.
- Provably fair: `computeCrashPoint(seed, client, nonce)` bate com vetores fixos; hash chain verificável.

E2E obrigatórios (cenários do README):
1. Apostar → multiplicador sobe → cashout → saldo atualizado.
2. Apostar → crash → aposta perdida.
3. Erros: saldo insuficiente, aposta dupla, aposta durante RUNNING, cashout sem bet.

## Anti-padrões (não fazer)

- ❌ `number` para `amountCents`/`multiplier`. Use `bigint` ou VO com `bigint` interno.
- ❌ Lógica de domínio dentro de controller. Controller só traduz.
- ❌ Emitir WS direto do use case. Use case emite evento de domínio; gateway WS subscreve.
- ❌ Publicar no broker fora de transação (dual-write bug). Sempre outbox.
- ❌ Confiar em `multiplier` vindo do cliente no cashout. Servidor recalcula pelo tempo decorrido.
- ❌ Hardcode de constantes mágicas (duração da fase, house edge, N da hash chain). Vão em config.
