import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import {
  KC_AUTHORITY,
  KC_CLIENT_ID,
  KC_POST_LOGOUT_REDIRECT_URI,
  KC_REDIRECT_URI,
} from '@/lib/oidc-config'

export async function signinRegister(): Promise<void> {
  const um = new UserManager({
    authority: KC_AUTHORITY,
    client_id: KC_CLIENT_ID,
    redirect_uri: KC_REDIRECT_URI,
    post_logout_redirect_uri: KC_POST_LOGOUT_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    metadata: {
      issuer: KC_AUTHORITY,
      authorization_endpoint: `${KC_AUTHORITY}/protocol/openid-connect/registrations`,
      token_endpoint: `${KC_AUTHORITY}/protocol/openid-connect/token`,
      userinfo_endpoint: `${KC_AUTHORITY}/protocol/openid-connect/userinfo`,
      end_session_endpoint: `${KC_AUTHORITY}/protocol/openid-connect/logout`,
      jwks_uri: `${KC_AUTHORITY}/protocol/openid-connect/certs`,
    },
  })
  await um.signinRedirect()
}
