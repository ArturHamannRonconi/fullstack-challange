import { Inject, Injectable } from "@nestjs/common";
import { type IError, Output } from "ddd-tool-kit";

import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IGetLeaderboardInput } from "./get-leaderboard.input";
import type { IGetLeaderboardOutput } from "./get-leaderboard.output";

const MAX_PER_PAGE = 50;
const DEFAULT_PER_PAGE = 20;

@Injectable()
export class GetLeaderboardService
  implements Service<IGetLeaderboardInput, IGetLeaderboardOutput>
{
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(
    input: IGetLeaderboardInput,
  ): Promise<Output<IGetLeaderboardOutput> | Output<IError>> {
    const page = Math.max(1, Math.trunc(input.page ?? 1));
    const perPage = Math.min(
      MAX_PER_PAGE,
      Math.max(1, Math.trunc(input.perPage ?? DEFAULT_PER_PAGE)),
    );
    const search = input.search?.trim() || undefined;

    const { items, total } = await this.rounds.findLeaderboard({
      page,
      perPage,
      search,
    });

    return Output.success({ items, total, page, perPage });
  }
}
