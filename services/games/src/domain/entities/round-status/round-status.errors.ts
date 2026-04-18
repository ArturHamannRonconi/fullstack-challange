import type { IError } from "ddd-tool-kit";

export const INVALID_ROUND_STATUS: IError = {
  message: "Invalid round status entry.",
  statusCode: 400,
};
