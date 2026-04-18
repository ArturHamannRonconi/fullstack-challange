import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@crash/auth";
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { CashoutService } from "../../application/services/cashout/cashout.service";
import { CashoutResponseDto } from "../dtos/round.response.dto";
import { toBetDto } from "../mappers/round-response.mapper";
import { toNestException } from "@crash/utils";

@Controller()
export class CashoutController {
  constructor(private readonly service: CashoutService) {}

  @UseGuards(JwtAuthGuard)
  @Post("bet/cashout")
  @HttpCode(HttpStatus.OK)
  async execute(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashoutResponseDto> {
    const out = await this.service.execute({
      playerId: user.userId,
      username: user.username,
    });
    if (out.isFailure) throw toNestException(out.result as IError);

    const { bet, round, multiplierScaled, totalPayoutCents, netProfitCents } = out.result as {
      bet: import("../../domain/entities/bet/bet.entity").BetEntity;
      round: import("../../domain/round.aggregate-root").RoundAggregateRoot;
      multiplierScaled: bigint;
      totalPayoutCents: string;
      netProfitCents: string;
    };

    return {
      bet: toBetDto(bet),
      roundId: round.id.value,
      multiplierScaled: multiplierScaled.toString(),
      totalPayoutCents,
      netProfitCents,
    };
  }
}
