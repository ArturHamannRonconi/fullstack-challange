import { HttpStatus } from "ddd-tool-kit";

const INVALID_OPERATION = {
  message: "Invalid operation entry.",
  statusCode: HttpStatus.BAD_REQUEST,
};

export { INVALID_OPERATION };
