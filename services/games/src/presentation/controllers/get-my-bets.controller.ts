import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@crash/auth";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { GetMyBetsService } from "../../application/services/get-my-bets/get-my-bets.service";
import { PaginationQueryDto } from "../dtos/pagination.dto";
import { MyBetsResponseDto } from "../dtos/round.response.dto";
import { toBetDto } from "../mappers/round-response.mapper";
import { toNestException } from "@crash/utils";

@Controller("bets")
export class GetMyBetsController {
  constructor(private readonly service: GetMyBetsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<MyBetsResponseDto> {
    const out = await this.service.execute({
      playerId: user.userId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    });
    if (out.isFailure) throw toNestException(out.result as IError);

    const { items, total, page, perPage } = out.result as {
      items: { round: import("../../domain/round.aggregate-root").RoundAggregateRoot; bet: import("../../domain/entities/bet/bet.entity").BetEntity }[];
      total: number;
      page: number;
      perPage: number;
    };

    return {
      items: items.map(({ round, bet }) => ({
        roundId: round.id.value,
        seedHash: round.seed.hash,
        crashPointScaled: round.crashPointScaled,
        currentStatus: round.currentStatus?.value ?? null,
        roundCreatedAt: round.createdAt.value.toISOString(),
        bet: toBetDto(bet),
      })),
      total,
      page,
      perPage,
    };
  }
}
