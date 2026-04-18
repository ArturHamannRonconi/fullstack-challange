import { Inject, Injectable } from "@nestjs/common";
import { type IError, Output } from "ddd-tool-kit";

import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IGetCurrentRoundInput } from "./get-current-round.input";
import type { IGetCurrentRoundOutput } from "./get-current-round.output";

@Injectable()
export class GetCurrentRoundService
  implements Service<IGetCurrentRoundInput, IGetCurrentRoundOutput>
{
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(
    _input: IGetCurrentRoundInput,
  ): Promise<Output<IGetCurrentRoundOutput> | Output<IError>> {
    const round = await this.rounds.findCurrent();
    return Output.success({ round });
  }
}
