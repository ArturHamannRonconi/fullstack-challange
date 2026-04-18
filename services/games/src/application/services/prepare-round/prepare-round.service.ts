import { Inject, Injectable, Logger } from "@nestjs/common";
import { EVENT_BROKER_PROVIDER, type IEventBroker } from "@crash/events";
import {
  type IError,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";

import { StartRoundDomainEvent } from "../../../domain/events/start-round.domain-event";
import { RoundAggregateRoot } from "../../../domain/round.aggregate-root";
import { RoundStateStore } from "../../../infrastructure/nosql/round-state.store";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IPrepareRoundInput } from "./prepare-round.input";
import type { IPrepareRoundOutput } from "./prepare-round.output";

@Injectable()
export class PrepareRoundService
  implements Service<IPrepareRoundInput, IPrepareRoundOutput>
{
  private readonly logger = new Logger(PrepareRoundService.name);

  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    private readonly roundState: RoundStateStore,
    @Inject(EVENT_BROKER_PROVIDER) private readonly eventBroker: IEventBroker,
  ) {}

  async execute(
    input: IPrepareRoundInput,
  ): Promise<Output<IPrepareRoundOutput> | Output<IError>> {
    try {
      const roundOut = RoundAggregateRoot.create();
      if (roundOut.isFailure) return throwFailOutput(roundOut);
      const round = roundOut.result as RoundAggregateRoot;

      await this.rounds.save(round);
      await this.roundState.setCrashPointScaled(round.id.value, round.crashPointScaled);

      const payload = { roundId: round.id.value, seedHash: round.seed.hash, crashPointScaled: round.crashPointScaled };
      const event = new StartRoundDomainEvent(payload);
      await this.eventBroker.client.publish(event);

      this.logger.log(
        `Prepared round ${round.id.value} (crashPoint=${round.crashPointScaled / 100})`,
      );

      return Output.success({ round });
    } catch (error) {
      this.logger.error("Failed to prepare round", error as Error);
      return Output.fail({
        message: "Internal error while preparing round.",
        statusCode: 500,
      });
    }
  }
}
