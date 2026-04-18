import type { IError } from "ddd-tool-kit";

export const INVALID_ROUND: IError = {
  message: "Invalid round.",
  statusCode: 400,
};

export const ROUND_NOT_BETTING_OPEN: IError = {
  message: "Round is not accepting bets right now.",
  statusCode: 422,
};

export const ROUND_NOT_RUNNING: IError = {
  message: "Round is not running — cashout unavailable.",
  statusCode: 422,
};

export const PLAYER_ALREADY_BET: IError = {
  message: "You already placed a bet for this round.",
  statusCode: 409,
};

export const BET_NOT_FOUND: IError = {
  message: "No bet found for this player in the current round.",
  statusCode: 404,
};

export const ROUND_ALREADY_STARTED: IError = {
  message: "Round has already started.",
  statusCode: 409,
};

export const ROUND_ALREADY_CRASHED: IError = {
  message: "Round has already crashed.",
  statusCode: 409,
};
