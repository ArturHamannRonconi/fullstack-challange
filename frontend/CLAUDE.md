# CLAUDE.md — `frontend/`

SPA Vite + React 19 que consome os serviços via Kong, autentica via Keycloak (OIDC PKCE) e recebe updates em tempo real por WebSocket.

Convenções gerais do monorepo estão em `../CLAUDE.md`. Aqui ficam só as regras específicas do frontend.

## Stack

Já instalado (`package.json`):
- **Vite 6** + **React 19** + **TypeScript 5.7**
- **@tanstack/react-query** (server state, cache, invalidation)
- **Zustand** (client state — jogo ao vivo)
- **Tailwind CSS v4** via plugin oficial do Vite (`@tailwindcss/vite`)

A instalar quando precisar:
- `socket.io-client` — conexão WS com `games`
- `oidc-client-ts` + `react-oidc-context` — OIDC PKCE sem implementar na mão
- `@tanstack/react-router` (preferido) ou `react-router-dom`
- `shadcn/ui` (componentes acessíveis por cima do Tailwind v4)
- `react-hot-toast` / `sonner` — notificações

**Não adicione Next.js.** O README aceita, mas o escopo não precisa de SSR e o setup seria puro custo aqui.

## Portas

- Dev: `bun run dev` → `http://localhost:5173`.
- Prod (preview via Docker): `http://localhost:3000`.
- **API**: sempre via Kong em `http://localhost:8000`. Nunca chame `:4001`/`:4002` direto.

## Estrutura recomendada

```
src/
├── main.tsx                → bootstrap (QueryClient, AuthProvider, Router)
├── App.tsx                 → layout/routes
├── index.css               → tailwind imports
├── components/             → UI genérica (Button, Card, Toast)
├── features/               → composição por feature (auth, game, wallet, auto-bet)
│   ├── game/
│   │   ├── CrashChart.tsx
│   │   ├── BetForm.tsx
│   │   ├── BetList.tsx
│   │   └── useGameSocket.ts
│   └── wallet/
│       ├── BalanceBadge.tsx
│       └── useWallet.ts
├── hooks/                  → hooks genéricos (useAuth, useApi)
├── pages/ ou routes/       → conforme o router escolhido
├── services/               → clients HTTP + WS (centralize o baseURL aqui)
├── stores/                 → zustand stores
└── lib/                    → utils (formatters, money, oidc config)
```

Prefira `features/` a "pages vs components vs hooks" global — escala melhor.

## Auth (OIDC PKCE → Keycloak)

Config:
- Authority: `http://localhost:8080/realms/crash-game`
- Client: `crash-game-client` (public, PKCE S256)
- Redirect URI: `http://localhost:5173/callback` (dev) / `http://localhost:3000/callback` (prod)
- Scopes: `openid profile` (adicione `offline_access` se precisar refresh longo)
- Post-logout redirect: `http://localhost:5173/`

Fluxo:
1. User clica "Entrar" → `authorization_endpoint` com `code_challenge`.
2. Loga no Keycloak → redirect pra `/callback` com `code`.
3. Biblioteca troca `code` + `verifier` por `access_token` + `refresh_token` + `id_token`.
4. Armazena em memória ou `sessionStorage` (evite `localStorage` — XSS).
5. `Authorization: Bearer <access_token>` em toda request REST e no handshake WS.
6. Logout: chama `end_session_endpoint` — senão a sessão SSO persiste no Keycloak.

**Nunca** tente validar JWT no frontend. Só use os claims (`sub`, `preferred_username`) pra exibir. Backend é quem valida.

## Cliente HTTP

Centralize em `src/services/api.ts`:
```ts
const api = axios.create({ baseURL: 'http://localhost:8000' });
api.interceptors.request.use(cfg => {
  const token = getAccessToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```

TanStack Query para tudo que vem do servidor (`useWallet`, `useRoundHistory`, `useMyBets`). Invalidate via evento WS (`wallet.updated`) em vez de polling.

## WebSocket

`games` expõe namespace `/game` em socket.io. Conecta com token:
```ts
const socket = io('http://localhost:8000/game', {
  auth: { token: getAccessToken() },
  transports: ['websocket'],
});
```

Eventos que o servidor emite (ver `services/games/CLAUDE.md` para payload completo):
- `round.started`, `round.bettingOpen`, `round.running`, `round.tick`, `round.crashed`
- `bet.placed`, `bet.cashedOut`, `bet.lost`
- `wallet.updated`

Ações do usuário (apostar, cashout) são **sempre REST**, nunca via WS.

## Estado

- **Server state** (saldo, histórico, lista de apostas): TanStack Query.
- **Client state do jogo** (multiplicador ao vivo, countdown, estado da rodada): Zustand. Atualizado pelo `useGameSocket()` em resposta a `round.tick`.
- **Auth**: contexto do `react-oidc-context`.

Não misture: saldo é server state (pode ser invalidado/refetch), multiplicador é client state (transiente, vem do WS em alta frequência).

## Multiplicador ao vivo

- Zustand guarda `multiplierScaled` (inteiro, × 10⁴). Ex: `23456` = `2.3456x`.
- Exibição em `useMemo(() => (scaled / 10000).toFixed(2) + 'x', [scaled])`.
- Curva do canvas usa `requestAnimationFrame`, **não** re-renderiza React a cada frame. Leia do store via ref dentro do loop de animação.
- Interpolação opcional entre ticks (100ms é visível) — mas **display oficial** usa o último tick do servidor, não a interpolação. Cashout envia apenas a decisão; o servidor recalcula o valor pelo tempo.

## Formatação de dinheiro

```ts
const fmtBRL = (cents: bigint | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(cents) / 100);
```

Para input de valor, receba em string, valide regex `^\d+([.,]\d{0,2})?$`, converta pra cents (`bigint`), só então envie. **Nunca** faça math em reais no frontend — converta pra cents logo na borda.

## UI/UX (requisitos do README)

- **Dark mode only** (estética de cassino: fundo escuro, acentos neon/vibrante).
- **Responsivo** (mobile + desktop).
- **Animações suaves**: curva do crash, feedback de cashout, animação do crash (shake/flash vermelho).
- **Loading**: skeletons (não spinners genéricos) nas listas e no saldo.
- **Erros**: toast notifications. Tipos: saldo insuficiente, erro de rede, timeout de saga.
- **Acessibilidade**: contraste AA, foco visível, `aria-live` para multiplicador e resultados.

## Páginas mínimas

- `/` — redireciona pra `/game` se autenticado, pra login caso contrário.
- `/callback` — processa o OIDC code → troca por tokens.
- `/game` — tela principal (chart, controles, histórico, painel de apostas ao vivo).
- `/auto-bet` — (bônus) config de estratégia automática.
- `/verify/:roundId` — verificador provably fair (usa função pura de `packages/@crash/provably-fair`).

## Testes

O README permite Bun test ou Vitest. Vitest casa melhor com o ecossistema Vite.

Obrigatórios:
- Utilitários de formatação (`fmtBRL`, parsing de input).
- Hook `useGameSocket` (mock do socket).
- Componente `BetForm` (disabled states, validação).
- Verificador provably fair (usa vetores fixos vindos do `packages/`).

Bônus: Playwright rodando 1 smoke (login → aposta → cashout) — cai em `packages/playwright` ou `tests/e2e/` na raiz, não aqui.

## Performance e DX

- Strict mode do React ligado (já está em `main.tsx`). Ok se effects rodam 2x em dev.
- Evite re-render no tick de 100ms — puxe via `useStore(state => state.scaled)` com seletor fino, ou mova pra `useSyncExternalStore`.
- Throttle optimistic updates em `BetList` (usuário clica apostar, mostra localmente antes do `bet.placed` chegar).

## Anti-padrões (não fazer)

- ❌ `fetch` direto espalhado pelo código. Centralize em `services/`.
- ❌ `localStorage` pra access token. Use memória + refresh silencioso.
- ❌ Lógica de cálculo monetário em `number` float. Valores em cents desde a borda.
- ❌ Emitir ações via WS (`socket.emit('placeBet')`). WS é push-only server→client.
- ❌ Recalcular crash/multiplicador no cliente. Confia no servidor.
- ❌ Polling do saldo. Invalidate via `wallet.updated` WS.
- ❌ Validação só no frontend. Servidor rejeita de qualquer jeito; front só melhora UX.
- ❌ Importar direto de `services/games/src/...`. Tudo compartilhado passa por `packages/`.
