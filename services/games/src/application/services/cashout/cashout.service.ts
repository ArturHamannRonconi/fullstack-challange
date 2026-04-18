import { Inject, Injectable, Logger } from "@nestjs/common";
import { EVENT_BROKER_PROVIDER, type IEventBroker } from "@crash/events";
import { computeMultiplierScaled, MULTIPLIER_SCALE } from "@crash/game";
import {
  type IError,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";

import { CashedOutDomainEvent } from "../../../domain/events/cashed-out.domain-event";

import { PlayerIdValueObject } from "../../../domain/value-objects/player-id/player-id.value-object";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import { RoundStateStore } from "../../../infrastructure/nosql/round-state.store";
import type { Service } from "../service.interface";
import type { ICashoutInput } from "./cashout.input";
import type { ICashoutOutput } from "./cashout.output";

@Injectable()
export class CashoutService implements Service<ICashoutInput, ICashoutOutput> {
  private readonly logger = new Logger(CashoutService.name);

  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    private readonly roundState: RoundStateStore,
    @Inject(EVENT_BROKER_PROVIDER) private readonly eventBroker: IEventBroker,
  ) {}

  async execute(input: ICashoutInput): Promise<Output<ICashoutOutput> | Output<IError>> {
    try {
      const playerIdOut = PlayerIdValueObject.init({ value: input.playerId });
      if (playerIdOut.isFailure) return throwFailOutput(playerIdOut);
      const playerId = playerIdOut.result as PlayerIdValueObject;

      const round = await this.rounds.findCurrent();
      if (!round) return Output.fail({ message: "No active round.", statusCode: 404 });
      if (!round.isRunning) {
        return Output.fail({
          message: "Round is not running — cashout unavailable.",
          statusCode: 422,
        });
      }

      const startedAtMs =
        (await this.roundState.getStartedAtMs(round.id.value)) ??
        round.startedAt?.value.getTime() ??
        null;
      if (startedAtMs === null) {
        return Output.fail({ message: "Round start time unknown.", statusCode: 500 });
      }

      const crashPointScaled = await this.roundState.getCrashPointScaled(round.id.value);

      const elapsedMs = Date.now() - startedAtMs;
      let multiplierScaled = computeMultiplierScaled(elapsedMs);
      // Cap to crash point (trust server ceiling, not wall clock).
      if (crashPointScaled !== null) {
        const crashScaledTo10k = BigInt(crashPointScaled) * 100n; // (x100) → (x10000)
        if (multiplierScaled > crashScaledTo10k) multiplierScaled = crashScaledTo10k;
      }
      if (multiplierScaled < MULTIPLIER_SCALE) multiplierScaled = MULTIPLIER_SCALE;

      const cashedOut = round.cashOutBetFor(playerId, multiplierScaled);
      if (cashedOut.isFailure) return throwFailOutput(cashedOut);
      const { bet } = cashedOut.result as {
        bet: import("../../../domain/entities/bet/bet.entity").BetEntity;
      };

      const totalPayout = bet.computeTotalPayout(multiplierScaled);
      const netProfitCents = totalPayout.cents - bet.stakedAmount.cents;

      await this.rounds.save(round);

      const payload = {
        roundId: round.id.value,
        betId: bet.id.value,
        playerId: playerId.value,
        username: input.username ?? bet.username,
        multiplierScaled: multiplierScaled.toString(),
        stakedAmountCents: bet.stakedAmount.toCentsString(),
        totalPayoutCents: totalPayout.toCentsString(),
        netProfitCents: netProfitCents.toString(),
      };
      const event = new CashedOutDomainEvent(payload);
      await this.eventBroker.client.publish(event);

      this.logger.log(
        `Player ${playerId.value} cashed out of ${round.id.value} at ${Number(multiplierScaled) / 10_000}x; net=${netProfitCents}`,
      );

      return Output.success({
        bet,
        round,
        multiplierScaled,
        totalPayoutCents: totalPayout.toCentsString(),
        netProfitCents: netProfitCents.toString(),
      });
    } catch (error) {
      this.logger.error("Failed to cashout", error as Error);
      return Output.fail({
        message: "Internal error while cashing out.",
        statusCode: 500,
      });
    }
  }
}
