import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { IError } from "ddd-tool-kit";

export function toNestException(error: IError): HttpException {
  switch (error.statusCode) {
    case 400:
      return new BadRequestException(error.message);
    case 401:
      return new UnauthorizedException(error.message);
    case 403:
      return new ForbiddenException(error.message);
    case 404:
      return new NotFoundException(error.message);
    case 409:
      return new ConflictException(error.message);
    case 422:
      return new UnprocessableEntityException(error.message);
    case 502:
      return new BadGatewayException(error.message);
    default:
      return (
        new HttpException(error.message, error.statusCode ?? 500) ??
        new InternalServerErrorException(error.message)
      );
  }
}
