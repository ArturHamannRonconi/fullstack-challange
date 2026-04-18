import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  type IError,
  type IdValueObject,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";
import { IdValueObject as Id } from "ddd-tool-kit";

import { RoundStatusTypeValueObject } from "../../../domain/value-objects/round-status-type/round-status-type.value-object";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import { RoundStateStore } from "../../../infrastructure/nosql/round-state.store";
import type { Service } from "../service.interface";
import type { IStartGameInput } from "./start-game.input";
import type { IStartGameOutput } from "./start-game.output";

@Injectable()
export class StartGameService implements Service<IStartGameInput, IStartGameOutput> {
  private readonly logger = new Logger(StartGameService.name);

  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    private readonly roundState: RoundStateStore,
  ) {}

  async execute(
    input: IStartGameInput,
  ): Promise<Output<IStartGameOutput> | Output<IError>> {
    try {
      const idOut = Id.init({ value: input.roundId });
      if (idOut.isFailure) return throwFailOutput(idOut);

      const round = await this.rounds.findById(idOut.result as IdValueObject);
      if (!round) {
        return Output.fail({ message: "Round not found.", statusCode: 404 });
      }

      // Idempotent: if already running or past, skip lifecycle transitions.
      if (round.isRunning || round.isCrashed) {
        return Output.success({ roundId: round.id.value });
      }

      // Emit the intermediate statuses so the history is complete even
      // though Websocket is the only one that reflects them in the UI.
      if (round.isBettingOpen) {
        const closed = round.transitionTo(RoundStatusTypeValueObject.bettingClosed());
        if (closed.isFailure) return throwFailOutput(closed);
      }

      const started = round.startRunning(input.startedAtMs);
      if (started.isFailure) return throwFailOutput(started);

      await this.rounds.save(round);
      await this.roundState.setStartedAtMs(round.id.value, input.startedAtMs);

      this.logger.log(`Round ${round.id.value} → RUNNING at ${input.startedAtMs}`);
      return Output.success({ roundId: round.id.value });
    } catch (error) {
      this.logger.error("Failed to start round", error as Error);
      return Output.fail({
        message: "Internal error while starting round.",
        statusCode: 500,
      });
    }
  }
}
