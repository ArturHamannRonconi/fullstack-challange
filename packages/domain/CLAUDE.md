# CLAUDE.md — `packages/domain` (`@crash/domain`)

**Pacote puro** (sem NestJS, ORM, rede). Atualmente exporta apenas `MoneyValueObject`.

## Escopo

- **Hoje**: `MoneyValueObject` — VO monetário em `bigint` (cents) com `add`, `subtract`, `multiplyByScaledMultiplier`, `compareTo`, helpers de formatação.
- **Tudo mais** (base `ValueObject`/`Entity`/`Aggregate`, `IdValueObject`, `DateValueObject`, `Output`, `IError`, `HttpStatus`, utils) vem de **`ddd-tool-kit`** (npm).

## Por que `bigint` e não `number`

`0.1 + 0.2 !== 0.3` em IEEE 754. Em cassino com volume, drift acumula e vira problema legal. `bigint` nativo nunca perde precisão até `2^63`, suficiente para valores monetários.

## Regras

- **Imutável.** Toda operação retorna um novo `MoneyValueObject`.
- **Subtração** com resultado negativo retorna `Output.fail(NEGATIVE_MONEY_RESULT)`. Nunca permita saldo negativo no domínio.
- **Multiplicação com multiplicador escalado** (`scale = 10_000n`) **trunca** (floor): `payoutCents = floor(amountCents * scaledMultiplier / scale)`. Arredondar a favor da casa é intencional — nunca creditar centavo a mais.
- **Serialização JSON**: exporte via `toCentsString()` em payloads REST.

## Anti-padrões

- ❌ `number` / `parseFloat` para cents.
- ❌ Depender de `@nestjs/*`, `@prisma/*`, `axios`, `fetch`, etc. Este pacote é **puro**.
- ❌ Adicionar outros VOs aqui. Só entra depois de aparecer uso por mais de um workspace.
