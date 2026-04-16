# CLAUDE.md — `services/wallets`

Bounded context da **carteira do jogador**: saldo, reserva, débito, crédito. Precisão monetária aqui é critério eliminatório.

Convenções gerais do monorepo estão em `../../CLAUDE.md`. Aqui ficam só as regras específicas deste serviço.

## Escopo e não-escopo

**Faz aqui:**
- Manter `Wallet` (uma por usuário) com `balanceCents` e `reservedCents`.
- Consumir comandos do broker: `wallets.reserve`, `wallets.release`, `wallets.debit`, `wallets.credit`.
- Expor leitura de saldo via REST (`GET /wallets/me`) e criação de carteira (`POST /wallets`).
- Emitir eventos pós-mutação (`FundsReserved`, `FundsDebited`, `FundsCredited`, `InsufficientFunds`, `wallet.updated`).

**Não faz:**
- **Não expõe crédito/débito via REST.** Todas as mutações de saldo vêm do broker.
- Não conhece regra de jogo (round, crash, bet). Só sabe de valores e userIds.
- Não emite eventos WS diretamente. Publica no broker e o `games` repassa.

## Precisão monetária (regra inegociável)

1. **Nunca `number` para dinheiro.** IEEE 754 quebra `0.1 + 0.2`. Em sistema de cassino com volume, drift acumula e vira problema legal.
2. **`BIGINT` em centavos** no banco. `balance_cents`, `reserved_cents`, `amount_cents`.
3. **Value Object `Money`** em `packages/@crash/money` (compartilhado com `games`). Operações: `add`, `subtract`, `multiplyByScaledMultiplier(scaled, scale=10000)`, `compareTo`, `toCents()`, `toBRL()`. **Imutável**.
4. **Multiplicação com multiplicador** arredonda **truncando a favor da casa**: `payoutCents = floor(amountCents * multiplierScaled / 10000)`. Truncamento é intencional — nunca creditar centavo a mais.
5. **Serialização JSON**: BigInt não é serializável nativamente. Mande como string ou number seguro (se `balanceCents < Number.MAX_SAFE_INTEGER = 9e15`, `number` é OK, mas prefira `string` por disciplina).
6. **Validação de entrada**: aposta mínima 1,00 (100 cents) e máxima 1.000,00 (100000 cents) — verifique no serviço, não confie no frontend.

## Estrutura DDD

```
src/
├── main.ts                 → bootstrap
├── app.module.ts           → wiring
├── domain/                 → Wallet aggregate, LedgerEntry, Money VO (ou via shared), events
├── application/            → use cases (Credit/Debit/Reserve/Release/GetBalance)
├── infrastructure/         → ORM repo, RabbitMQ consumers, OutboxPublisher
└── presentation/
    ├── controllers/        → WalletsController (REST de leitura)
    └── dtos/
```

Regras de dependência idênticas a `services/games` (domain não importa NestJS, etc.). Ver `../games/CLAUDE.md` para detalhes.

## Agregado e entidades

- **`Wallet`** (aggregate root): `userId` (PK, vem do `sub` do JWT), `balanceCents`, `reservedCents`, `version` (optimistic lock), `updatedAt`.
  - Invariantes: `balanceCents >= 0`, `reservedCents >= 0`, `balanceCents >= reservedCents` (sempre).
  - Operações: `reserve(amount)`, `releaseReservation(amount)`, `debitReservation(amount)`, `credit(amount)`.
  - `availableCents = balanceCents - reservedCents`.
- **`LedgerEntry`** (recomendado, double-entry): `id`, `walletId`, `type` (`CREDIT`/`DEBIT`/`RESERVE`/`RELEASE`), `amountCents`, `refId` (bet ou reserva de origem), `createdAt`. Serve pra auditoria e reconciliação. Soma do ledger deve bater com `balance` — job periódico detecta drift.

## Queues consumidas

Todas idempotentes via **inbox pattern** (checa `messageId` antes de processar).

| Queue                | Payload                                                        | Efeito                                           | Reply/Emit                         |
|----------------------|----------------------------------------------------------------|--------------------------------------------------|-----------------------------------|
| `wallets.reserve`    | `{ userId, amountCents, messageId }`                           | `balance -= amount`, `reserved += amount`        | Reply `FundsReserved` / `InsufficientFunds` |
| `wallets.release`    | `{ userId, amountCents, sourceReservationId, messageId }`      | `reserved -= amount`, `balance += amount`        | Emit `FundsReleased`              |
| `wallets.debit`      | `{ userId, amountCents, sourceReservationId, messageId }`      | `reserved -= amount` (consome reserva)           | Emit `FundsDebited`               |
| `wallets.credit`     | `{ userId, amountCents, sourceReservationId?, messageId }`     | `reserved -= amount` (se source) + `balance += payout` | Emit `FundsCredited`       |

Cada handler:
1. Abre transação.
2. Consulta `inbox` por `messageId` → se existe, abort (ignore ou responde com status anterior).
3. `SELECT ... FOR UPDATE` na `Wallet` (ou optimistic via `version`).
4. Aplica mutação + insere `LedgerEntry` + insere linha na `inbox`.
5. Escreve evento na `outbox` (mesma transação).
6. Commit.
7. `OutboxPublisher` publica pro broker assíncrono.

**Isolation level mínimo**: `READ COMMITTED` com `SELECT FOR UPDATE`, ou `SERIALIZABLE` + retry em conflito. Sem isolamento apropriado, double-bet race condition permite saldo negativo.

## REST endpoints (via Kong em `/wallets/*`)

| Método | Path            | Auth | Lógica                                                                     |
|--------|-----------------|------|---------------------------------------------------------------------------|
| POST   | `/wallets`      | ✅   | Cria carteira para o user autenticado (idempotente — upsert por `userId`) |
| GET    | `/wallets/me`   | ✅   | Retorna `{ balanceCents, availableCents, reservedCents }`                 |

Nada mais. **Não adicione POST `/credit` ou `/debit`** — se surgir requisito de "depósito do jogador", simule via seed inicial ou via callback de payment provider (evento no broker).

## Padrões obrigatórios

- **Outbox + Inbox** (detalhes em `services/games/CLAUDE.md`). RabbitMQ é at-least-once; sem inbox, crédito duplicado = bug crítico.
- **Idempotência por `messageId`**. Geração: `uuid` v4 no emissor.
- **Optimistic locking** na `Wallet` (coluna `version` incrementada a cada write) — alternativa a `FOR UPDATE`.
- **Reconciliação**: job que soma `LedgerEntry` e compara com `balance_cents`. Loga alerta se drift.
- **Nunca permita saldo negativo.** Se `reserve` pediria balance negativo → reject com `InsufficientFunds`, não deixe passar.

## Env vars (ver `.env.example`)

- `PORT=4002`
- `DATABASE_URL=postgresql://admin:admin@postgres:5432/wallets`
- `RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672`
- Provavelmente adicionar: `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URI`, `SEED_INITIAL_BALANCE_CENTS` (ex: 10000).

## Seed inicial

O usuário `player` do Keycloak (`sub` fixo no realm) deve ter carteira com saldo inicial ao `docker:up`. Implementar via migration seed ou via script que roda no startup (`onApplicationBootstrap`).

## Testes

```bash
bun test          # tests/unit — Wallet VO, use cases com repo mock
bun run test:e2e  # tests/e2e — requer Postgres + RabbitMQ reais
```

Unit obrigatórios:
- `Money`: soma, subtração, multiplicação escalada, precisão em valores grandes, arredondamento.
- `Wallet`: reserve com saldo suficiente OK; reserve acima do saldo rejeita; debit da reserva OK; credit aumenta balance; invariantes mantidos.
- Inbox: segundo processamento do mesmo `messageId` é no-op.

E2E obrigatórios:
- Consumir `wallets.reserve` duas vezes com mesmo `messageId` → saldo reservado só uma vez.
- Crédito concorrente: 10 mensagens paralelas → saldo final = soma exata.
- Reserve > saldo → responde `InsufficientFunds`, sem alterar estado.

## Anti-padrões (não fazer)

- ❌ `number` / `parseFloat` para centavos. `BigInt` ou `bigint` nativo.
- ❌ `Decimal.prototype.toNumber()` para persistir — quebra precisão se exceder MAX_SAFE_INTEGER.
- ❌ Commit do write sem publicar evento (ou vice-versa). Use outbox.
- ❌ Ignorar `messageId` nos consumers — duplicatas vão chegar e vão creditar dobrado.
- ❌ Expor `POST /credit` / `POST /debit` via HTTP — fere o contrato do README.
- ❌ Misturar lógica de jogo aqui (não saber o que é "round", "bet", "crash"). Esse contexto é do `games`.
- ❌ Roundtrip JSON com `number` para valores grandes — use `string` ou `bigint` serializado explicitamente.
