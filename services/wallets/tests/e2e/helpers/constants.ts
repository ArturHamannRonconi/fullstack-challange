export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:8000";
export const KEYCLOAK_URL = process.env.TEST_KEYCLOAK_URL ?? "http://localhost:8080";
export const KEYCLOAK_REALM = process.env.TEST_KEYCLOAK_REALM ?? "crash-game";
export const KEYCLOAK_CLIENT_ID = process.env.TEST_KEYCLOAK_CLIENT_ID ?? "crash-game-client";
export const TEST_USERNAME = process.env.TEST_USERNAME ?? "player";
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "player123";

// Connection from the host machine (tests run outside Docker network).
export const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://admin:admin@localhost:5432/wallets";

export const INITIAL_BALANCE_CENTS = 50_000n;
export const MIN_AMOUNT_CENTS = 100n;
export const MAX_AMOUNT_CENTS = 100_000n;
