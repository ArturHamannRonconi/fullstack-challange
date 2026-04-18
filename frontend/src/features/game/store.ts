import { create } from 'zustand'

import { LiveBet, LivePhase, RoundDto } from './types'

interface GameState {
  phase: LivePhase
  roundId: string | null
  seedHash: string | null
  /** Server seed revealed after the round crashes (fetched via verify endpoint). */
  revealedSeed: string | null
  multiplier: number
  crashPoint: number | null
  bets: LiveBet[]
  history: number[] // last 20 crash points (most recent first)
  /** Epoch ms when the betting window closes; null outside of `betting_open`. */
  bettingClosesAtMs: number | null
  /** performance.now() value when the current round started running; null otherwise. */
  gameStartTime: number | null
  /** The current player's active bet ID, persisted across socket reconnects. */
  myBetId: string | null
  /** The roundId in which myBetId was placed, used to invalidate the bet on round change. */
  myBetRoundId: string | null
  /** Last roundId that crashed — used as default for the verify page. */
  lastCrashedRoundId: string | null

  setPhase: (phase: LivePhase) => void
  setRevealedSeed: (serverSeed: string) => void
  onRoundStart: (payload: { roundId: string; seedHash: string }) => void
  onBettingOpen: (closesAtMs?: number) => void
  onBettingClosed: () => void
  onGameStart: () => void
  onTick: (multiplier: number) => void
  onCrashed: (crashPoint: number) => void
  onPreparing: () => void
  addBet: (bet: LiveBet) => void
  markCashedOut: (payload: { playerId: string; multiplier: number }) => void
  resetBets: () => void
  seedHistory: (points: number[]) => void
  hydrateFromSnapshot: (round: RoundDto | null) => void
  setMyBet: (betId: string) => void
  clearMyBet: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'idle',
  roundId: null,
  seedHash: null,
  revealedSeed: null,
  multiplier: 1,
  crashPoint: null,
  bets: [],
  history: [],
  bettingClosesAtMs: null,
  gameStartTime: null,
  myBetId: null,
  myBetRoundId: null,
  lastCrashedRoundId: null,

  setPhase: (phase) => set({ phase }),

  setRevealedSeed: (serverSeed) => set({ revealedSeed: serverSeed }),

  onPreparing: () =>
    set({
      phase: 'preparing',
      multiplier: 1,
      bets: [],
      crashPoint: null,
      bettingClosesAtMs: null,
      gameStartTime: null,
      // intentionally does NOT clear myBetId/myBetRoundId — socket reconnects
      // can trigger onPreparing while the user's bet round is still unsettled;
      // the roundId check in canCashout guards against stale bets
    }),

  onRoundStart: ({ roundId, seedHash }) =>
    set({
      phase: 'preparing',
      roundId,
      seedHash,
      revealedSeed: null,
      multiplier: 1,
      crashPoint: null,
      bets: [],
      bettingClosesAtMs: null,
      gameStartTime: null,
      myBetId: null,
      myBetRoundId: null,
    }),

  onBettingOpen: (closesAtMs) =>
    set({
      phase: 'betting_open',
      multiplier: 1,
      bettingClosesAtMs: closesAtMs ?? null,
    }),

  onBettingClosed: () => set({ phase: 'betting_closed', bettingClosesAtMs: null }),

  onGameStart: () =>
    set({ phase: 'running', multiplier: 1, bettingClosesAtMs: null, gameStartTime: performance.now() }),

  onTick: (multiplier) =>
    set((state) => (state.phase === 'running' ? { multiplier } : state)),

  onCrashed: (crashPoint) =>
    set((state) => ({
      phase: 'crashed',
      multiplier: crashPoint,
      crashPoint,
      history: [crashPoint, ...state.history].slice(0, 20),
      myBetId: null,
      myBetRoundId: null,
      lastCrashedRoundId: state.roundId ?? state.lastCrashedRoundId,
    })),

  addBet: (bet) =>
    set((state) => {
      // Dedupe by id so double-broadcast doesn't show the same bet twice.
      if (state.bets.some((b) => b.id === bet.id)) return state
      return { bets: [bet, ...state.bets].slice(0, 50) }
    }),

  markCashedOut: ({ playerId, multiplier }) =>
    set((state) => ({
      bets: state.bets.map((b) =>
        b.playerId === playerId && !b.isCashedOut
          ? { ...b, isCashedOut: true, cashOutMultiplier: multiplier }
          : b,
      ),
    })),

  resetBets: () => set({ bets: [] }),

  seedHistory: (points) => set({ history: points.slice(0, 20) }),

  // Seed live state from a /rounds/current snapshot so UI doesn't have to wait
  // for the next round cycle when the client connects mid-round.
  hydrateFromSnapshot: (round) =>
    set((state) => {
      if (state.phase !== 'idle') return state
      if (!round) return state

      const seedHash = round.seedHash
      const roundId = round.id
      const bets: LiveBet[] = round.bets.map((b) => ({
        id: b.id,
        playerId: b.playerId,
        username: b.username,
        stakedAmountCents: b.stakedAmountCents,
        isCashedOut: b.isCashedOut,
        cashOutMultiplier:
          b.isCashedOut && b.cashOutPointScaled
            ? Number(b.cashOutPointScaled) / 10_000
            : undefined,
      }))

      switch (round.currentStatus) {
        case 'BETTING_OPEN':
          return { phase: 'betting_open', roundId, seedHash, multiplier: 1, bets, crashPoint: null, gameStartTime: null }
        case 'BETTING_CLOSED':
          return { phase: 'betting_closed', roundId, seedHash, multiplier: 1, bets, crashPoint: null, gameStartTime: null }
        case 'ROUND_START': {
          const startedAtMs = round.startedAtMs ?? Date.now()
          const elapsed = Math.max(0, Date.now() - startedAtMs)
          const multiplier = Math.exp(0.00006 * elapsed)
          const gameStartTime = performance.now() - elapsed
          return { phase: 'running', roundId, seedHash, multiplier, bets, crashPoint: null, gameStartTime }
        }
        case 'CRASHED': {
          const crashPoint = round.crashPointScaled / 100
          return {
            phase: 'crashed',
            roundId,
            seedHash,
            revealedSeed: round.serverSeed ?? null,
            multiplier: crashPoint,
            bets,
            crashPoint,
            gameStartTime: null,
            lastCrashedRoundId: roundId,
          }
        }
        default:
          return state
      }
    }),

  setMyBet: (betId) =>
    set((state) => ({ myBetId: betId, myBetRoundId: state.roundId })),

  clearMyBet: () => set({ myBetId: null, myBetRoundId: null }),
}))

// Expose the store to Playwright/browser tests in dev builds. Vite tree-shakes
// this block in production because `import.meta.env.DEV` is statically false.
if (import.meta.env.DEV) {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore =
    useGameStore
}
