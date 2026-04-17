import { HttpStatus } from "ddd-tool-kit";

const INVALID_OPERATION_TYPE = {
  message: "Operation type must be one of DEPOSIT, WITHDRAW, RESERVE, LOST, WIN.",
  statusCode: HttpStatus.BAD_REQUEST,
};

export { INVALID_OPERATION_TYPE };
