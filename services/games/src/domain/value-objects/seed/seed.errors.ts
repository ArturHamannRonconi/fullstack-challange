import type { IError } from "ddd-tool-kit";

export const INVALID_SEED: IError = {
  message: "Invalid seed. Expected a non-empty string.",
  statusCode: 400,
};
