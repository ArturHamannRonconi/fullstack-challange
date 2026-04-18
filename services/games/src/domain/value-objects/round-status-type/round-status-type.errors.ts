import type { IError } from "ddd-tool-kit";

export const INVALID_ROUND_STATUS_TYPE: IError = {
  message:
    "Invalid round status. Must be PREPARING, BETTING_OPEN, BETTING_CLOSED, ROUND_START or CRASHED.",
  statusCode: 400,
};
