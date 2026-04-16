# CLAUDE.md — `packages/`

Código **compartilhado** entre `services/games`, `services/wallets` e (onde aplicável) `frontend/`. Cada subpasta é um pacote Bun workspace independente, publicado sob o scope `@crash/*`.

Convenções gerais do monorepo estão em `../CLAUDE.md`. Aqui ficam só as regras de como criar/organizar pacotes compartilhados.

## Quando colocar algo aqui

Coloque em `packages/` se **todas** forem verdade:
1. É usado por mais de um workspace (2 services, ou service + frontend).
2. É **puro** ou tem dependências mínimas (sem NestJS, sem ORM concreto, sem acesso a rede).
3. Mudar o código afeta os consumidores de forma controlada — contratos, DTOs, fórmulas.

Se só um service usa, **fica no service**. Resista à abstração prematura.

## Pacotes previstos (conforme os planos em `prompts/`)

| Pacote                   | Conteúdo                                                                                             | Consumers                    |
|--------------------------|------------------------------------------------------------------------------------------------------|------------------------------|
| `@crash/money`           | VO `Money` (BigInt cents), `Multiplier` escalado, formatters                                         | games, wallets, frontend     |
| `@crash/provably-fair`   | `computeCrashPoint(seed, client, nonce)`, `verify(seed, hash)`, geração de hash chain                | games, frontend (verificador) |
| `@crash/events`          | Tipos TS dos eventos de broker (`wallets.reserve`, `FundsReserved`, etc.) e eventos WS               | games, wallets, frontend     |
| `@crash/eslint`          | Config ESLint compartilhada (o README já menciona `@crash/eslint`)                                   | todos                        |

Nem todos precisam existir desde o M0. Crie quando o primeiro duplicate de código aparecer (regra "rule of two" — não antes).

## Padrão de cada pacote

```
packages/<nome>/
├── package.json      → name: "@crash/<nome>", private: true, type: "module"
├── tsconfig.json     → extends do root (strict)
├── src/
│   └── index.ts      → export público
└── tests/            → bun test — funções puras são triviais de testar
```

`package.json` mínimo:
```json
{
  "name": "@crash/money",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "bun test" }
}
```

Consumer importa:
```ts
import { Money } from "@crash/money";
```

Bun workspaces resolve via symlink — **não precisa publicar** no npm nem rodar build. TS lê direto o `.ts`.

## Regras de pureza

Os pacotes compartilhados **não podem**:
- Importar `@nestjs/*` (Nest é framework de aplicação, não domínio).
- Importar ORMs (`@mikro-orm/*`, `@prisma/*`, `typeorm`).
- Chamar rede (`fetch`, `axios`, `socket.io`).
- Ler arquivos ou env vars.
- Depender de React/DOM (a menos que o pacote seja especificamente pra frontend — e nesse caso isole em `packages/ui/` e deixe claro no README dele).

### Exceção explícita: `@crash/auth`

`packages/auth/` é o **único** pacote autorizado a importar `@nestjs/*`. Justificativa: a verificação de JWT via JWKS (passport-jwt + jwks-rsa) precisa de DI/Module/Guard do Nest e seria duplicada em `games` e `wallets` se ficasse nos services. Auth é segurança — uma fonte única revisada > duas cópias que podem divergir.

Restrições do `@crash/auth`:
- **Server-only.** **Nunca** declarar como dependência em `frontend/package.json` (Bun não vai symlinkar, `import` falha no resolve).
- Só faz **verificação de assinatura + parsing de claims padrão** (sub, preferred_username, realm_access.roles). Regras de autorização específicas de domínio ficam no service.
- Sem segredos: usa RS256 + JWKS público do Keycloak. Se um dia precisar de HS256/segredo simétrico, não vai pra cá.
- Outros pacotes shared **continuam proibidos** de importar `@nestjs/*`. Esta exceção não abre precedente — ver `packages/auth/CLAUDE.md`.

Os pacotes **podem**:
- Usar `crypto` nativo do Node/Bun (provably-fair precisa de `createHmac`).
- Depender de libs puras de utilitário (`zod`, `decimal.js` se precisar — prefira `bigint` nativo).

Essa pureza garante:
- Testes rodam em ms (sem bootstrap de Nest ou DB).
- Frontend pode reutilizar sem arrastar backend.
- Fácil portar pra Deno/Workers no futuro.

## `@crash/money` (quando criar)

API mínima:
```ts
class Money {
  static fromCents(cents: bigint): Money;
  static fromDecimalString(value: string): Money;  // "10.50" → 1050 cents
  readonly cents: bigint;
  add(other: Money): Money;
  subtract(other: Money): Money;
  multiplyByScaled(multiplierScaled: bigint, scale = 10000n): Money;  // trunca
  isGreaterThanOrEqual(other: Money): boolean;
  toCents(): bigint;
  toBRL(): string;
}
```

Testes obrigatórios: adição exata (`0.10 + 0.20 === 0.30`), multiplicação trunca a favor da casa, conversão round-trip `fromDecimalString("1234,56")` ↔ `1234.56`.

## `@crash/provably-fair` (quando criar)

API mínima:
```ts
computeCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number; // em × 10⁴
verifyCommitment(serverSeed: string, expectedHash: string): boolean;
generateHashChain(length: number, terminalSeed?: string): string[];  // [seed[0], seed[1], ...]
```

Implementação: HMAC-SHA256 + house edge 1/33 (Bustabit). Vetores de teste conhecidos para regressão.

**Mesma função usada no backend (game loop) e no frontend (modal de verificação).** Essa é a razão deste pacote existir.

## `@crash/events` (quando criar)

Apenas **tipos TypeScript** (nenhum runtime). Contratos entre broker publisher/consumer e entre backend/frontend WS:

```ts
export type WalletsReserveCommand = { userId: string; amountCents: string; messageId: string };
export type FundsReservedEvent    = { userId: string; amountCents: string; messageId: string; reservationId: string };
export type RoundTickEvent        = { roundId: string; multiplierScaled: number };
// ...
```

Use `string` para valores monetários na wire (evita perda de precisão em JSON).

## `@crash/eslint` (scaffold já previsto)

Config compartilhada (`flat config`). Aplica regras de TS strict, import ordering, no-floating-promises. Cada workspace extende.

## Versionamento e instalação

- `private: true` em todos. Não há intenção de publicar.
- Workspaces resolvem por nome no `package.json` da raiz (`"workspaces": ["packages/*", ...]`).
- Consumer declara dependência normal: `"@crash/money": "workspace:*"` (ou só listar no `package.json`; Bun aceita path implícito).
- `bun install` na raiz linka tudo.

## Testes

```bash
cd packages/money && bun test
# ou globalmente
bun test packages/
```

Cobertura esperada: alta (funções puras são baratas de testar e críticas — Money e provably-fair são o "coração" matemático do sistema).

## Anti-padrões (não fazer)

- ❌ Criar pacote "utils" genérico. Nomeie pelo domínio (`@crash/money`, não `@crash/utils`).
- ❌ Depender de NestJS aqui. Se o código precisa de DI, ele vive no service.
- ❌ Copiar `Money.ts` em dois services em vez de extrair. Se você está copiando, é hora do pacote.
- ❌ Adicionar build step (tsc → dist). Bun roda `.ts` direto via workspaces.
- ❌ Publicar no npm. `private: true` protege contra isso.
- ❌ Introduzir side effects no top-level do `index.ts` (logging, env reading, singletons com estado).
