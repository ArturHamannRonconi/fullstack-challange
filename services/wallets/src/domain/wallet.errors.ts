import { HttpStatus } from "ddd-tool-kit";

const INVALID_WALLET = {
  message: "Invalid wallet data.",
  statusCode: HttpStatus.BAD_REQUEST,
};

const WALLET_DOES_NOT_EXIST = {
  message: "Wallet does not exist for this user.",
  statusCode: HttpStatus.NOT_FOUND,
};

const WALLET_ALREADY_EXISTS = {
  message: "Wallet already exists for this user.",
  statusCode: HttpStatus.CONFLICT,
};

const INSUFFICIENT_FUNDS = {
  message: "Insufficient available funds for this operation.",
  statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
};

const AMOUNT_OUT_OF_RANGE = {
  message: "Amount must be between 100 and 100000 cents (R$ 1,00 – R$ 1.000,00).",
  statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
};

const RESERVE_DOES_NOT_EXIST = {
  message: "Reserve entry not found on this wallet.",
  statusCode: HttpStatus.NOT_FOUND,
};

export {
  INVALID_WALLET,
  WALLET_DOES_NOT_EXIST,
  WALLET_ALREADY_EXISTS,
  INSUFFICIENT_FUNDS,
  AMOUNT_OUT_OF_RANGE,
  RESERVE_DOES_NOT_EXIST,
};
