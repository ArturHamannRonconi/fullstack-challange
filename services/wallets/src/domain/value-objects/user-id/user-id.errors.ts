import { HttpStatus } from "ddd-tool-kit";

const INVALID_USER_ID = {
  message: "User ID must be a valid UUID v4 (Keycloak subject).",
  statusCode: HttpStatus.BAD_REQUEST,
};

export { INVALID_USER_ID };
