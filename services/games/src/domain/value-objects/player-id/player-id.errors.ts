import type { IError } from "ddd-tool-kit";

export const INVALID_PLAYER_ID: IError = {
  message: "Invalid player id. Expected a Keycloak `sub` (UUID v4).",
  statusCode: 400,
};
