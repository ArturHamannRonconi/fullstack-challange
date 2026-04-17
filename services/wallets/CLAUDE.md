# CLAUDE.md — `services/wallets`

Bounded context da **carteira do jogador**: saldo, reserva, débito, crédito. Precisão monetária aqui é critério eliminatório.

Convenções gerais do monorepo estão em `../../CLAUDE.md`. Aqui ficam só as regras específicas deste serviço.

## Escopo e não-escopo

**Faz aqui:**
- Manter `Wallet` (uma por usuário, constraint `UNIQUE(userId)`) com `balance` (cents) e coleções de `Operation` e `Reserve`.
- Expor REST autenticado:
  - `POST /wallets` — cria carteira do usuário autenticado (idempotente; retorna a existente se já houver). Saldo inicial: **50.000 cents (R$ 500,00)**. Gera uma `OperationEntity` de tipo `DEPOSIT` com o valor inicial.
  - `GET /wallets/me` — retorna a carteira do usuário autenticado com `balance`, `availableFunds`, `reservedFunds`, `operations` e `reserves`.
  - `PATCH /wallets/deposit` — deposita fundos.
  - `PATCH /wallets/withdraw` — saca fundos (apenas do disponível; não pode atingir valores reservados).
- Consumir comandos do broker (futuro, M4/M5): `wallets.reserve`, `wallets.release`, `wallets.debit`, `wallets.credit`.
- Emitir eventos pós-mutação (futuro, M4/M5): `FundsReserved`, `FundsDebited`, `FundsCredited`, `InsufficientFunds`, `wallet.updated`.

**Não faz:**
- Não conhece regra de jogo (round, crash, bet). Só sabe de valores e userIds.
- Não emite eventos WS diretamente. Publica no broker e o `games` repassa.
- Não permite saque que comprometa o reservado (`availableFunds = balance - sum(reserveds)`; saque `> availableFunds` → 422).

## Precisão monetária (regra inegociável)

1. **Nunca `number` para dinheiro.** IEEE 754 quebra `0.1 + 0.2`. Em sistema de cassino com volume, drift acumula e vira problema legal.
2. **`BIGINT` em centavos** no banco. `balance`, `funds` (em `Operation` e `Reserve`).
3. **Value Object `MoneyValueObject`** em `packages/domain` (`@crash/domain`). Operações: `add`, `subtract`, `multiplyByScaledMultiplier(scaled, scale=10000)`, `compareTo`, `isGreaterThanOrEqual`, `toCents()`, `toBRL()`. **Imutável, base `bigint` nativa**.
4. **Multiplicação com multiplicador** arredonda **truncando a favor da casa**: `payoutCents = floor(amountCents * multiplierScaled / 10000)`. Truncamento é intencional — nunca creditar centavo a mais.
5. **Serialização JSON**: BigInt não é serializável nativamente. **Mande como `string`** em todos os payloads REST (`balance: "50000"`, `amountCents: "1000"`).
6. **Validação de entrada**: depósito/saque mínimo 100 cents (R$ 1,00) e máximo 100.000 cents (R$ 1.000,00). Verifique no serviço; não confie no frontend.

## Estrutura DDD (Prisma + ddd-tool-kit)

```
src/
├── main.ts                        → bootstrap (ValidationPipe global, Swagger)
├── app.module.ts                  → wiring
├── domain/
│   ├── wallet.aggregate-root.ts
│   ├── wallet.props.ts
│   ├── wallet.errors.ts
│   ├── entities/
│   │   ├── operation/
│   │   └── reserve/
│   └── value-objects/
│       ├── operation-type/
│       └── user-id/
├── application/
│   └── services/                  → CreateWallet, GetMyWallet, Deposit, Withdraw
├── infrastructure/
│   └── database/                  → tudo que fala com Postgres/Prisma
│       ├── schema.prisma          → schema canônico (Prisma Client)
│       ├── migrations/            → migrations versionadas
│       ├── prisma.service.ts      → PrismaClient (NestJS provider)
│       ├── repositories/
│       │   ├── wallet.repository.ts         → interface
│       │   └── prisma.wallet.repository.ts  → implementação
│       ├── mappers/
│       │   ├── wallet.mapper.ts
│       │   ├── operation.mapper.ts
│       │   └── reserve.mapper.ts
│       └── schema/                → tipos derivados do Prisma (includes)
└── presentation/
    ├── controllers/               → um controller por use case (1:1 com application/services)
    │   ├── health.controller.ts            → GET /health
    │   ├── create-wallet.controller.ts     → POST /wallets
    │   ├── get-my-wallet.controller.ts     → GET /wallets/me
    │   ├── deposit.controller.ts           → PATCH /wallets/deposit
    │   ├── withdraw.controller.ts          → PATCH /wallets/withdraw
    │   └── output-exception.ts             → helper IError → NestJS HttpException
    ├── dtos/                      → request + response DTOs
    └── mappers/                   → aggregate → DTO (unidirectional)
```

**Por que sem pasta `prisma/`?** Tudo relacionado ao ORM (schema, migrations, client wrapper) é detalhe de infraestrutura e mora dentro de `infrastructure/database/`. Isso mantém `domain/` e `application/` completamente alheios ao Prisma, e evita diretórios de ferramenta no topo do serviço.

Regras de dependência: `domain` não importa NestJS, ORM, ou rede; `application` orquestra; `infrastructure` fala com banco/broker; `presentation` expõe HTTP/WS.

## ORM — Prisma

- **Schema canônico** em `src/infrastructure/database/schema.prisma`. `BigInt` para valores monetários (cents).
- **`@prisma/client`** instalado como dep. `prisma` como devDep.
- `PrismaService` (NestJS provider com `onModuleInit` chamando `$connect()`).
- Repositórios implementam `IRepository<WalletAggregateRoot>` (contrato do `ddd-tool-kit`) + métodos extras (`findByUserId`).
- Mappers seguem `IBidirectionalMapper` (ver `docs/files-patterns/bidirectional-mapper.md`).
- Migrations rodam via `prisma migrate deploy` no startup do container (ver seção "Docker").

## Base DDD — `ddd-tool-kit` + `@crash/domain`

- Classes base (`ValueObject`, `Entity`, `Aggregate`, `IdValueObject`, `DateValueObject`, `Output`, `IError`, `HttpStatus`, `verifyAreValueObjects`, `verifyAllPropsExists`, `throwFailOutput`) vêm de `ddd-tool-kit`.
- `MoneyValueObject` vem de `@crash/domain` (o único VO compartilhado custom por enquanto).
- `UserIdValueObject` é **local** a este service (Keycloak `sub` é UUID v4 → incompatível com `IdValueObject` 16-char do ddd-tool-kit).
- `OperationTypeValueObject` é local (enum: `DEPOSIT`, `WITHDRAW`, `RESERVE`, `LOST`, `WIN`).

## Agregado e entidades

- **`WalletAggregateRoot`**: `id` (walletId, `IdValueObject`), `userId` (`UserIdValueObject`), `balance` (`MoneyValueObject`), `reserveds` (`ReserveEntity[]`), `historic` (`OperationEntity[]`), `createdAt`, `updatedAt`.
  - **Invariantes**: `balance >= 0`; `balance >= sum(reserveds.funds)`.
  - **Operações**:
    - `depositFunds(amount)` → adiciona ao `balance`, registra `OperationEntity(DEPOSIT)`.
    - `withdrawFunds(amount)` → subtrai do `balance` **se `amount <= availableFunds`**; registra `OperationEntity(WITHDRAW)`.
    - `reserveFunds(roundId, betId, amount)` → valida `amount <= availableFunds`, adiciona `ReserveEntity`, registra `OperationEntity(RESERVE)`.
    - `settleReservedFunds(reservedId, payout?)` → remove reserva; se houver `payout` credita (`balance += payout`, `OperationEntity(WIN)`); senão `OperationEntity(LOST)` (não devolve ao balance).
  - `availableFunds = balance - sum(reserveds.funds)`.
- **`OperationEntity`**: `id`, `type` (`OperationTypeValueObject`), `funds` (`MoneyValueObject`), `createdAt`.
- **`ReserveEntity`**: `id`, `funds`, `betId` (`IdValueObject`), `roundId` (`IdValueObject`).

## REST endpoints (via Kong em `/wallets/*`)

| Método  | Path                 | Auth | Lógica                                                                                              |
|---------|----------------------|------|----------------------------------------------------------------------------------------------------|
| POST    | `/wallets`           | ✅   | Cria carteira (idempotente — retorna existente se já houver). Saldo inicial 50.000 cents (R$ 500). |
| GET     | `/wallets/me`        | ✅   | Retorna `{ id, userId, balance, availableFunds, reservedFunds, operations, reserves, ... }`        |
| PATCH   | `/wallets/deposit`   | ✅   | `{ amountCents: string }` → adiciona ao balance, registra `OperationEntity(DEPOSIT)`.              |
| PATCH   | `/wallets/withdraw`  | ✅   | `{ amountCents: string }` → subtrai do balance (só se `availableFunds ≥ amount`), registra WITHDRAW. |
| GET     | `/health`            | ❌   | Health check público (liveness para compose).                                                       |

Validações de entrada (via `class-validator`):
- `amountCents` é string numérica positiva, entre 100 e 100.000 (cents).
- Fora desse range → `422 Unprocessable Entity`.

Respostas (sempre):
- `201 Created` em `POST /wallets` quando cria; `200 OK` quando retorna existente.
- `200 OK` em GET/PATCH.
- `401 Unauthorized` sem Bearer válido.
- `404 Not Found` em `GET /me` sem carteira criada.
- `422` em saldo insuficiente (withdraw).

## Padrões obrigatórios

- **Serviços implementam `Service<Input, Output>` (interface `ddd-tool-kit`)** retornando `Output<T> | Output<IError>`.
- **1 controller por use case** (seguindo `docs/files-patterns/controller.md`). Cada controller injeta um único service, expõe uma única rota REST, e usa `toNestException` para traduzir `Output<IError>` → exceções Nest (`BadRequestException`, `NotFoundException`, `ConflictException`, etc. mapeado pelo `statusCode`).
- **Mappers obrigatórios**: bidirectional (schema ↔ aggregate) e unidirectional (aggregate → response DTO).
- **DTOs de request** validados via `class-validator` + `ValidationPipe` global.
- **Idempotência em POST /wallets**: se já existe carteira para o `userId`, retorna a existente (status `200`) em vez de criar duplicada.

### Padrões futuros (M4/M5 — integração com games)

- **Outbox + Inbox** (detalhes em `services/games/CLAUDE.md`). RabbitMQ é at-least-once; sem inbox, crédito duplicado = bug crítico.
- **Idempotência por `messageId`**. Geração: `uuid` v4 no emissor.
- **Optimistic locking** na `Wallet` (coluna `version` incrementada a cada write) — alternativa a `FOR UPDATE`.
- **Reconciliação**: job que soma `Operation` e compara com `balance`. Loga alerta se drift.

## Env vars (ver `.env.example`)

- `PORT=4002`
- `DATABASE_URL=postgresql://admin:admin@postgres:5432/wallets`
- `RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672` (futuro)
- `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`, `KEYCLOAK_JWKS_URI` — obrigatórios.
- `WALLET_INITIAL_BALANCE_CENTS=50000` — usado em `CreateWalletService`.

## Docker

- Dockerfile roda `bunx prisma generate` no build e `bunx prisma migrate deploy` antes de iniciar o bun (via `CMD` shell).
- Health check: `GET /health` (público).

## Criação automática de carteira

- A wallet deve existir **para cada user do Keycloak**. Como não há hoje SPI de eventos do Keycloak plugado no compose, a garantia é via frontend: após o login bem-sucedido, o frontend chama `POST /wallets` idempotente — se já existia, retorna a mesma; se não, cria com saldo de 50.000 cents.
- DB enforce `UNIQUE(userId)` → 1 wallet por user no nível de schema.

## Testes

```bash
bun test          # tests/unit — Wallet, VOs, use cases com repo mock
bun run test:e2e  # tests/e2e — exige stack up (bun run docker:up)
```

### Unit (`tests/unit/`)
- `MoneyValueObject`: soma, subtração, multiplicação escalada, precisão em valores grandes, arredondamento.
- `WalletAggregateRoot`: deposit OK; withdraw OK; withdraw > availableFunds rejeita; reserve OK; settle com payout credita; invariantes mantidos.
- Use cases: cada um com mock de repository → asserção em fluxo de sucesso + erros mapeados.

### E2E (`tests/e2e/`)
- **Um arquivo por rota** (`health`, `create-wallet`, `get-my-wallet`, `deposit`, `withdraw`), espelhando os controllers.
- Cliente HTTP via **Playwright `APIRequestContext`**. Token real do Keycloak (`player`/`player123`). DB real via Prisma apontando para `localhost:5432`.
- Estado isolado: `resetWalletForUser` (Prisma) em `beforeAll`/`beforeEach` derruba a wallet do user antes de cada cenário que precisa de balance determinístico.
- **Execução sequencial obrigatória**: como o usuário `player` tem `UNIQUE(userId)`, arquivos não podem rodar em paralelo. O script `tests/e2e/run-sequential.ts` forka um `bun test` por arquivo — `bun run test:e2e` invoca esse runner.
- Cobertura mínima por rota: `401` sem auth, status + shape de sucesso, validação (`400`) e regras de domínio (`422`).

## Anti-padrões (não fazer)

- ❌ `number` / `parseFloat` para centavos. `bigint` nativo.
- ❌ `Decimal.prototype.toNumber()` para persistir — quebra precisão se exceder MAX_SAFE_INTEGER.
- ❌ Roundtrip JSON com `number` para valores grandes — use `string` serializado explicitamente.
- ❌ Permitir saque que comprometa reservado. `availableFunds = balance - sum(reserveds.funds)`; saque `> available` → 422.
- ❌ Criar `POST /wallets` não idempotente. Se já existe, retorna a existente.
- ❌ Misturar lógica de jogo aqui. Esse contexto é do `games`.
- ❌ Expor rota para alterar `userId` ou `id` da carteira.
