import type { IError } from "ddd-tool-kit";

export const INVALID_CASH_OUT_POINT: IError = {
  message: "Invalid cash out point. Must be a positive scaled multiplier >= 10000 (1.00x).",
  statusCode: 400,
};
