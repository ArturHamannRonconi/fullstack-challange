import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  type IError,
  type IdValueObject,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";
import { IdValueObject as Id } from "ddd-tool-kit";

import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import { RoundStateStore } from "../../../infrastructure/nosql/round-state.store";
import type { Service } from "../service.interface";
import type { IProcessCrashInput } from "./process-crash.input";
import type { IProcessCrashOutput } from "./process-crash.output";

@Injectable()
export class ProcessCrashService
  implements Service<IProcessCrashInput, IProcessCrashOutput>
{
  private readonly logger = new Logger(ProcessCrashService.name);

  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    private readonly roundState: RoundStateStore,
  ) {}

  async execute(
    input: IProcessCrashInput,
  ): Promise<Output<IProcessCrashOutput> | Output<IError>> {
    try {
      const idOut = Id.init({ value: input.roundId });
      if (idOut.isFailure) return throwFailOutput(idOut);

      const round = await this.rounds.findById(idOut.result as IdValueObject);
      if (!round) return Output.fail({ message: "Round not found.", statusCode: 404 });

      if (round.isCrashed) {
        const losing = round.bets.filter((b) => !b.isCashedOut).length;
        return Output.success({
          roundId: round.id.value,
          crashPointScaled: round.crashPointScaled,
          losingBetsCount: losing,
        });
      }

      const crashed = round.crash();
      if (crashed.isFailure) return throwFailOutput(crashed);

      await this.rounds.save(round);
      await this.roundState.clearRound(round.id.value);

      const losingBetsCount = round.bets.filter((b) => !b.isCashedOut).length;
      this.logger.log(
        `Round ${round.id.value} CRASHED at ${round.crashPointScaled / 100}x; losing bets: ${losingBetsCount}`,
      );
      return Output.success({
        roundId: round.id.value,
        crashPointScaled: round.crashPointScaled,
        losingBetsCount,
      });
    } catch (error) {
      this.logger.error("Failed to process crash", error as Error);
      return Output.fail({
        message: "Internal error while processing crash.",
        statusCode: 500,
      });
    }
  }
}
