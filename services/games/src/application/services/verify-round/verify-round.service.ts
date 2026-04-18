import { Inject, Injectable } from "@nestjs/common";
import {
  type IError,
  IdValueObject,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";

import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IVerifyRoundInput } from "./verify-round.input";
import type { IVerifyRoundOutput } from "./verify-round.output";

@Injectable()
export class VerifyRoundService
  implements Service<IVerifyRoundInput, IVerifyRoundOutput>
{
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(
    input: IVerifyRoundInput,
  ): Promise<Output<IVerifyRoundOutput> | Output<IError>> {
    const idOut = IdValueObject.init({ value: input.roundId });
    if (idOut.isFailure) return throwFailOutput(idOut);

    const round = await this.rounds.findById(idOut.result as IdValueObject);
    if (!round) return Output.fail({ message: "Round not found.", statusCode: 404 });

    if (!round.isCrashed) {
      return Output.fail({
        message: "Round has not crashed yet — seed is not revealed.",
        statusCode: 409,
      });
    }

    const isValid = round.seed.verify(round.id.value, round.crashPointScaled);
    return Output.success({
      roundId: round.id.value,
      serverSeed: round.seed.value,
      seedHash: round.seed.hash,
      crashPointScaled: round.crashPointScaled,
      isValid,
    });
  }
}
