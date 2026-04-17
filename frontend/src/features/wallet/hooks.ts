import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'

import {
  WalletApiError,
  createWallet,
  depositFunds,
  getMyWallet,
  withdrawFunds,
} from './api'
import type { WalletDto } from './types'

const WALLET_QUERY_KEY = ['wallet', 'me'] as const

function useAccessToken(): string | null {
  const auth = useAuth()
  return auth.user?.access_token ?? null
}

export function useWallet() {
  const token = useAccessToken()

  return useQuery<WalletDto, WalletApiError>({
    queryKey: WALLET_QUERY_KEY,
    enabled: !!token,
    queryFn: () => getMyWallet(token!),
    retry: (failureCount, error) => {
      if (error instanceof WalletApiError && error.status === 404) return false
      return failureCount < 2
    },
    staleTime: 5_000,
  })
}

export function useEnsureWallet() {
  const token = useAccessToken()
  const qc = useQueryClient()

  return useMutation<WalletDto, WalletApiError>({
    mutationKey: ['wallet', 'ensure'],
    mutationFn: async () => {
      if (!token) throw new WalletApiError('Missing access token.', 401)
      return createWallet(token)
    },
    onSuccess: (wallet) => {
      qc.setQueryData(WALLET_QUERY_KEY, wallet)
    },
  })
}

export function useDeposit() {
  const token = useAccessToken()
  const qc = useQueryClient()

  return useMutation<WalletDto, WalletApiError, { amountCents: string }>({
    mutationKey: ['wallet', 'deposit'],
    mutationFn: async ({ amountCents }) => {
      if (!token) throw new WalletApiError('Missing access token.', 401)
      return depositFunds(token, amountCents)
    },
    onSuccess: (wallet) => {
      qc.setQueryData(WALLET_QUERY_KEY, wallet)
    },
  })
}

export function useWithdraw() {
  const token = useAccessToken()
  const qc = useQueryClient()

  return useMutation<WalletDto, WalletApiError, { amountCents: string }>({
    mutationKey: ['wallet', 'withdraw'],
    mutationFn: async ({ amountCents }) => {
      if (!token) throw new WalletApiError('Missing access token.', 401)
      return withdrawFunds(token, amountCents)
    },
    onSuccess: (wallet) => {
      qc.setQueryData(WALLET_QUERY_KEY, wallet)
    },
  })
}

export { WALLET_QUERY_KEY }
