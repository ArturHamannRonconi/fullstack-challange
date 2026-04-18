import { WebStorageStateStore } from 'oidc-client-ts'
import { AuthProviderProps } from 'react-oidc-context'

export const KC_AUTHORITY = import.meta.env.VITE_KC_AUTHORITY as string
export const KC_CLIENT_ID = import.meta.env.VITE_KC_CLIENT_ID as string
export const KC_REDIRECT_URI = import.meta.env.VITE_KC_REDIRECT_URI as string
export const KC_POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_KC_POST_LOGOUT_REDIRECT_URI as string
export const KC_ACCOUNT_URL = import.meta.env.VITE_KC_ACCOUNT_URL as string

export const oidcConfig: AuthProviderProps = {
  authority: KC_AUTHORITY,
  client_id: KC_CLIENT_ID,
  redirect_uri: KC_REDIRECT_URI,
  post_logout_redirect_uri: KC_POST_LOGOUT_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  onSigninCallback: () => {
    window.history.replaceState(null, '', '/game')
  },
}
