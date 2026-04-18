import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

import { WALLET_QUERY_KEY } from '@/features/wallet/hooks'
import { getCurrentRound, verifyRound } from './api'
import { useGameStore } from './store'

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:4003'

/**
 * App-wide subscription to the games websocket. Lives on the root so switching
 * tabs (Wallet, Best Players, etc.) doesn't tear the socket down. On tab
 * visibility restoration, re-syncs from /rounds/current so the UI doesn't show
 * stale state after long alt+tab.
 */
export function useGameSocket(): void {
  const auth = useAuth()
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = auth.user?.access_token
    const socket = io(WS_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    })
    socketRef.current = socket

    const store = useGameStore.getState()

    const syncSnapshot = async () => {
      try {
        const snapshot = await getCurrentRound()
        useGameStore.getState().hydrateFromSnapshot(snapshot)
      } catch (err) {
        console.warn('[ws] snapshot refetch failed', err)
      }
    }

    socket.on('connect', () => {
      syncSnapshot()
    })

    socket.on('connect_error', (err) => {
      console.warn('[ws] connect_error', err.message)
    })

    socket.on('reconnect', () => {
      syncSnapshot()
    })

    socket.on('round:preparing', () => store.onPreparing())
    socket.on('round:start', (payload: { roundId: string; seedHash: string }) =>
      useGameStore.getState().onRoundStart(payload),
    )
    socket.on('round:betting_open', (payload?: { closesAtMs?: number }) =>
      useGameStore.getState().onBettingOpen(payload?.closesAtMs),
    )
    socket.on('round:betting_closed', () => useGameStore.getState().onBettingClosed())
    socket.on('round:game_start', () => useGameStore.getState().onGameStart())
    socket.on('round:game_tick', (payload: { multiplier: number }) =>
      useGameStore.getState().onTick(payload.multiplier),
    )
    socket.on('round:crashed', (payload: { crashPoint: number }) => {
      const { myBetId, myBetRoundId, roundId } = useGameStore.getState()
      const hadActiveBet = myBetId !== null && myBetRoundId === roundId

      useGameStore.getState().onCrashed(payload.crashPoint)

      if (hadActiveBet) {
        toast.error(`Crash! Sua aposta foi perdida em ${payload.crashPoint.toFixed(2)}x`, {
          description: 'O multiplicador crashou antes do seu cashout.',
          duration: 6000,
        })
      }

      // Reveal the server seed so the player can verify the committed hash.
      // Fire-and-forget; the UI falls back to "..." if this fails.
      if (roundId) {
        verifyRound(roundId)
          .then((dto) => useGameStore.getState().setRevealedSeed(dto.serverSeed))
          .catch((err) => console.warn('[ws] verifyRound failed', err))
      }

      qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['game', 'rounds-history'] })
      qc.invalidateQueries({ queryKey: ['game', 'leaderboard'] })
      if (roundId) qc.invalidateQueries({ queryKey: ['game', 'verify', roundId] })
    })

    socket.on(
      'round:bet',
      (payload: {
        roundId: string
        playerId: string
        username?: string
        stakedAmount: string
      }) => {
        useGameStore.getState().addBet({
          id: `${payload.roundId}:${payload.playerId}`,
          playerId: payload.playerId,
          username: payload.username,
          stakedAmountCents: payload.stakedAmount,
          isCashedOut: false,
        })
        qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
      },
    )

    socket.on(
      'round:cash_out',
      (payload: { playerId: string; multiplier: number }) => {
        useGameStore.getState().markCashedOut({
          playerId: payload.playerId,
          multiplier: payload.multiplier,
        })
        qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
        qc.invalidateQueries({ queryKey: ['game', 'leaderboard'] })
      },
    )

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!socket.connected) {
        socket.connect()
      } else {
        syncSnapshot()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
      socket.disconnect()
      socketRef.current = null
    }
  }, [auth.user?.access_token, qc])
}
