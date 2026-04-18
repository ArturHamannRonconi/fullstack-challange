import type { IError } from "ddd-tool-kit";

export const INVALID_BET: IError = {
  message: "Invalid bet.",
  statusCode: 400,
};

export const BET_ALREADY_CASHED_OUT: IError = {
  message: "Bet was already cashed out.",
  statusCode: 409,
};

export const BET_OUT_OF_RANGE: IError = {
  message: "Bet amount out of range. Must be between 100 and 100000 cents.",
  statusCode: 422,
};
