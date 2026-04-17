import { request, type APIRequestContext } from "playwright";

import {
  BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_REALM,
  KEYCLOAK_URL,
  TEST_PASSWORD,
  TEST_USERNAME,
} from "./constants";

export async function getAccessToken(): Promise<string> {
  const form = new URLSearchParams({
    grant_type: "password",
    client_id: KEYCLOAK_CLIENT_ID,
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
    scope: "openid",
  });

  const res = await fetch(
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
  );

  if (!res.ok) {
    throw new Error(
      `Keycloak token request failed (HTTP ${res.status}). Is the stack up?`,
    );
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Keycloak did not return an access_token.");
  return json.access_token;
}

export function extractSubFromToken(token: string): string {
  const [, payload] = token.split(".");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const json = JSON.parse(
    Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
  ) as { sub: string };
  return json.sub;
}

export async function makeAuthedApi(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function makePublicApi(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "Content-Type": "application/json" },
  });
}

export async function waitForWalletsUp(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/wallets/health`);
      if (res.ok) return;
    } catch {
      /* connection refused while stack boots */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `Wallets service unreachable at ${BASE_URL}/wallets/health. Run \`bun run docker:up\` first.`,
  );
}
