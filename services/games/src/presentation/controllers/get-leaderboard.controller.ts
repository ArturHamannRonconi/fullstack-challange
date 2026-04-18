import { Public } from "@crash/auth";
import { toNestException } from "@crash/utils";
import { Controller, Get, Query } from "@nestjs/common";
import { type IError } from "ddd-tool-kit";

import { GetLeaderboardService } from "../../application/services/get-leaderboard/get-leaderboard.service";
import type { IGetLeaderboardOutput } from "../../application/services/get-leaderboard/get-leaderboard.output";
import { LeaderboardQueryDto } from "../dtos/leaderboard-query.dto";
import { LeaderboardResponseDto } from "../dtos/round.response.dto";

@Controller("rounds")
export class GetLeaderboardController {
  constructor(private readonly service: GetLeaderboardService) {}

  @Public()
  @Get("leaderboard")
  async execute(@Query() query: LeaderboardQueryDto): Promise<LeaderboardResponseDto> {
    const out = await this.service.execute({
      page: query.page,
      perPage: query.perPage,
      search: query.search,
    });
    if (out.isFailure) throw toNestException(out.result as IError);

    const { items, total, page, perPage } = out.result as IGetLeaderboardOutput;

    return {
      items: items.map((entry) => ({
        playerId: entry.playerId,
        username: entry.username,
        totalProfitCents: entry.totalProfitCents.toString(),
        totalStakedCents: entry.totalStakedCents.toString(),
        betsCount: entry.betsCount,
        wins: entry.wins,
        losses: entry.losses,
      })),
      total,
      page,
      perPage,
    };
  }
}
