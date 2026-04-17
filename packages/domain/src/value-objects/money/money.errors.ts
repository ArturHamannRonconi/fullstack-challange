import { HttpStatus } from "ddd-tool-kit";

const INVALID_MONEY = {
  message: "Money must be a non-negative integer amount in cents.",
  statusCode: HttpStatus.BAD_REQUEST,
};

const NEGATIVE_MONEY_RESULT = {
  message: "Money arithmetic resulted in a negative amount.",
  statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
};

export { INVALID_MONEY, NEGATIVE_MONEY_RESULT };
