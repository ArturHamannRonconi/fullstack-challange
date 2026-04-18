import { Inject, Injectable } from "@nestjs/common";
import { type IError, Output, throwFailOutput } from "ddd-tool-kit";

import { PlayerIdValueObject } from "../../../domain/value-objects/player-id/player-id.value-object";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IGetMyBetsInput } from "./get-my-bets.input";
import type { IGetMyBetsOutput, MyBetView } from "./get-my-bets.output";

const MAX_PER_PAGE = 50;
const DEFAULT_PER_PAGE = 20;

@Injectable()
export class GetMyBetsService implements Service<IGetMyBetsInput, IGetMyBetsOutput> {
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(
    input: IGetMyBetsInput,
  ): Promise<Output<IGetMyBetsOutput> | Output<IError>> {
    const playerIdOut = PlayerIdValueObject.init({ value: input.playerId });
    if (playerIdOut.isFailure) return throwFailOutput(playerIdOut);
    const playerId = playerIdOut.result as PlayerIdValueObject;

    const page = Math.max(1, Math.trunc(input.page ?? 1));
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Math.trunc(input.perPage ?? DEFAULT_PER_PAGE)));

    const { items, total } = await this.rounds.findBetsByPlayer(playerId, {
      page,
      perPage,
    });

    const views: MyBetView[] = items
      .map(({ round, betId }) => {
        const bet = round.bets.find((b) => b.id.value === betId.value);
        return bet ? { round, bet } : null;
      })
      .filter((x): x is MyBetView => x !== null);

    return Output.success({ items: views, total, page, perPage });
  }
}
