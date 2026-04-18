import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { type IError } from "ddd-tool-kit";
import { IsNotEmpty, IsString, Matches } from "class-validator";

import { ReserveFundsService } from "../../application/services/reserve-funds/reserve-funds.service";
import { toNestException } from "@crash/utils";

class ReserveBodyDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  roundId!: string;

  @IsString()
  @IsNotEmpty()
  betId!: string;

  @IsString()
  @Matches(/^\d+$/, { message: "amountCents must be a positive integer string (in cents)." })
  amountCents!: string;
}

@Controller()
export class ReserveController {
  constructor(private readonly service: ReserveFundsService) {}

  @Post("reserve")
  @HttpCode(HttpStatus.OK)
  async reserve(@Body() body: ReserveBodyDto) {
    const out = await this.service.execute(body);
    if (out.isFailure) throw toNestException(out.result as IError);

    const { wallet, reserveId } = out.result as {
      wallet: { balance: { toCentsString(): string }; availableFunds: { toCentsString(): string } };
      reserveId: string;
    };

    return {
      reserveId,
      balanceCents: wallet.balance.toCentsString(),
      availableCents: wallet.availableFunds.toCentsString(),
    };
  }
}
