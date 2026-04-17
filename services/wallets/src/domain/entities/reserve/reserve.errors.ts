import { HttpStatus } from "ddd-tool-kit";

const INVALID_RESERVE = {
  message: "Invalid reserve entry.",
  statusCode: HttpStatus.BAD_REQUEST,
};

export { INVALID_RESERVE };
