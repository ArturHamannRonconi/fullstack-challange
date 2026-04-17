import { useEffect, useRef } from 'react'
import { useAuth } from 'react-oidc-context'

import { WalletApiError } from './api'
import { useEnsureWallet, useWallet } from './hooks'

/**
 * Silent idempotent bootstrap: after login, make sure the user has a wallet.
 * Assumes the Keycloak flow created the user — this matches the rule that
 * every Keycloak user gets exactly one wallet, with the initial balance.
 */
export function WalletBootstrap() {
  const auth = useAuth()
  const wallet = useWallet()
  const ensure = useEnsureWallet()
  const attempted = useRef(false)

  useEffect(() => {
    if (!auth.isAuthenticated) {
      attempted.current = false
      return
    }
    if (attempted.current) return
    if (wallet.isLoading) return

    const missing =
      wallet.isError &&
      wallet.error instanceof WalletApiError &&
      wallet.error.status === 404

    if (missing || wallet.data === undefined) {
      // For missing wallet (404) → create. If already exists, POST is idempotent and returns it.
      if (!missing && wallet.data) return
      if (ensure.isPending) return
      attempted.current = true
      ensure.mutate()
    }
  }, [auth.isAuthenticated, wallet.isLoading, wallet.isError, wallet.data, wallet.error, ensure])

  return null
}
