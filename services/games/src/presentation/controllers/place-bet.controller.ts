import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@crash/auth";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { PlaceBetService } from "../../application/services/place-bet/place-bet.service";
import { PlaceBetRequestDto } from "../dtos/place-bet.request.dto";
import { PlaceBetResponseDto } from "../dtos/round.response.dto";
import { toBetDto } from "../mappers/round-response.mapper";
import { toNestException } from "@crash/utils";

@Controller()
export class PlaceBetController {
  constructor(private readonly service: PlaceBetService) {}

  @UseGuards(JwtAuthGuard)
  @Post("bet")
  @HttpCode(HttpStatus.CREATED)
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PlaceBetRequestDto,
  ): Promise<PlaceBetResponseDto> {
    const out = await this.service.execute({
      playerId: user.userId,
      username: user.username,
      amountCents: body.amountCents,
    });
    if (out.isFailure) throw toNestException(out.result as IError);

    const { bet, round, balanceCents, availableCents } = out.result as {
      bet: import("../../domain/entities/bet/bet.entity").BetEntity;
      round: import("../../domain/round.aggregate-root").RoundAggregateRoot;
      balanceCents: string;
      availableCents: string;
    };

    return {
      bet: toBetDto(bet),
      roundId: round.id.value,
      balanceCents,
      availableCents,
    };
  }
}
