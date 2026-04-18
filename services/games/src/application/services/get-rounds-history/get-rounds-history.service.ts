import { Inject, Injectable } from "@nestjs/common";
import { type IError, Output } from "ddd-tool-kit";

import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IGetRoundsHistoryInput } from "./get-rounds-history.input";
import type { IGetRoundsHistoryOutput } from "./get-rounds-history.output";

const MAX_PER_PAGE = 50;
const DEFAULT_PER_PAGE = 20;

@Injectable()
export class GetRoundsHistoryService
  implements Service<IGetRoundsHistoryInput, IGetRoundsHistoryOutput>
{
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(
    input: IGetRoundsHistoryInput,
  ): Promise<Output<IGetRoundsHistoryOutput> | Output<IError>> {
    const page = Math.max(1, Math.trunc(input.page ?? 1));
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Math.trunc(input.perPage ?? DEFAULT_PER_PAGE)));

    const { items, total } = await this.rounds.findHistory({ page, perPage });
    return Output.success({ items, total, page, perPage });
  }
}
