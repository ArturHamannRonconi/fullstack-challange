# CLAUDE.md — `packages/auth` (`@crash/auth`)

**Server-only.** Verificação de JWT do Keycloak via JWKS para os microserviços NestJS.

## Por que existe

Único pacote shared autorizado a importar `@nestjs/*` (ver exceção em `../CLAUDE.md`). Existe pra evitar duplicar `JwtStrategy` + `AuthModule` + `JwtAuthGuard` em `services/games` e `services/wallets`. Auth é segurança — fonte única revisada vence duas cópias que divergem.

## NUNCA fazer

- ❌ Declarar `@crash/auth` em `frontend/package.json`. Bun workspaces resolve por declaração — sem isso, `import "@crash/auth"` quebra no build do Vite. **Essa é a defesa primária.**
- ❌ Adicionar segredos (HS256, API keys, signing secrets). RS256 + JWKS público do Keycloak é o único modo suportado.
- ❌ Adicionar regra de autorização específica de domínio (ex: "só admin pode X", "só dono da carteira pode Y"). Regras de domínio ficam no service que entende o domínio.
- ❌ Embutir lista de roles privilegiadas. O pacote só extrai claims; o service decide o que fazer com elas.
- ❌ Crescer escopo. Se precisar de OAuth client flow, refresh token, RBAC engine — vira pacote separado ou fica no service.

## API pública

```ts
import {
  AuthModule,
  JwtAuthGuard,
  CurrentUser,
  type AuthenticatedUser,
  type AuthModuleOptions,
} from "@crash/auth";

// app.module.ts
AuthModule.forRoot({
  issuer: process.env.KEYCLOAK_ISSUER!,         // ex: http://localhost:8080/realms/crash-game
  audience: process.env.KEYCLOAK_AUDIENCE!,     // ex: crash-game-client
  jwksUri: process.env.KEYCLOAK_JWKS_URI!,      // ex: http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs
})

// controller
@UseGuards(JwtAuthGuard)
@Get("me")
me(@CurrentUser() user: AuthenticatedUser) { ... }
```

## Validações aplicadas

- Algoritmo: **RS256 only** (rejeita `none`, HS256, etc.).
- `iss` deve bater com `issuer` configurado.
- `aud` deve incluir `audience` configurado.
- `exp` validado por `passport-jwt`.
- Assinatura validada com chave pública obtida via JWKS (cacheado, com rate limit).

## Pré-requisitos no Keycloak

Para `aud: crash-game-client` aparecer no access token, o realm precisa de um **Audience Mapper** no client. O `realm-export.json` atual **não tem** esse mapper — adicionar antes de subir validação de audience em produção (ou desativar `audience` na config como fallback temporário).

Para `iss` ser estável entre browser (localhost:8080) e backend (keycloak:8080 dentro do Docker), Keycloak precisa de `KC_HOSTNAME` fixo. Sem isso, `iss` varia conforme a URL usada e a validação falha.

Esses dois ajustes de infra são responsabilidade do compose/realm — não deste pacote.

## Testes

Idealmente: vetores fixos de JWT assinados com chave RSA conhecida + JWKS mockado. Ainda não implementados — adicionar quando o pacote estabilizar.
