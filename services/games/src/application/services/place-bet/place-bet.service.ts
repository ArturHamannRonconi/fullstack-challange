import { Inject, Injectable, Logger } from "@nestjs/common";
import { EVENT_BROKER_PROVIDER, type IEventBroker } from "@crash/events";
import { MoneyValueObject } from "@crash/domain";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";
import {
  IError,
  Output,
  throwFailOutput,
} from "ddd-tool-kit";

import { BetPlacedDomainEvent } from "../../../domain/events/bet-placed.domain-event";
import { BetEntity } from "../../../domain/entities/bet/bet.entity";
import { PlayerIdValueObject } from "../../../domain/value-objects/player-id/player-id.value-object";
import {
  ROUND_REPOSITORY,
  type RoundRepository,
} from "../../../infrastructure/database/repositories/round.repository";
import type { Service } from "../service.interface";
import type { IPlaceBetInput } from "./place-bet.input";
import type { IPlaceBetOutput } from "./place-bet.output";

const WALLET_STATE_KEY = (userId: string) => `wallet:state:${userId}`;

@Injectable()
export class PlaceBetService implements Service<IPlaceBetInput, IPlaceBetOutput> {
  private readonly logger = new Logger(PlaceBetService.name);

  constructor(
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
    @Inject(EVENT_BROKER_PROVIDER)
    private readonly eventBroker: IEventBroker,
  ) {}

  async execute(
    input: IPlaceBetInput,
  ): Promise<Output<IPlaceBetOutput> | Output<IError>> {
    try {
      const playerIdOut = PlayerIdValueObject.init({ value: input.playerId });
      if (playerIdOut.isFailure) return throwFailOutput(playerIdOut);
      const playerId = playerIdOut.result as PlayerIdValueObject;

      const amountOut = MoneyValueObject.fromCents(input.amountCents);
      if (amountOut.isFailure) return throwFailOutput(amountOut);
      const amount = amountOut.result as MoneyValueObject;

      const raw = await this.db.get(WALLET_STATE_KEY(playerId.value));
      if (!raw) {
        return Output.fail({ message: "Wallet not found.", statusCode: 404 });
      }

      const { balanceCents, availableCents } = JSON.parse(raw) as {
        balanceCents: string;
        availableCents: string;
      };

      if (BigInt(availableCents) < amount.cents) {
        return Output.fail({ message: "Insufficient funds.", statusCode: 422 });
      }

      const round = await this.rounds.findCurrent();
      if (!round) return Output.fail({ message: "No active round.", statusCode: 404 });

      if (!round.isBettingOpen) {
        return Output.fail({
          message: "Betting is closed for the current round.",
          statusCode: 422,
        });
      }

      if (round.hasBetFromPlayer(playerId)) {
        return Output.fail({
          message: "You already placed a bet for this round.",
          statusCode: 409,
        });
      }

      const placed = round.placeBet({
        playerId,
        stakedAmount: amount,
        username: input.username,
      });

      if (placed.isFailure) return throwFailOutput(placed);
      const bet = placed.result as BetEntity;

      await this.rounds.save(round);

      const payload = {
        roundId: round.id.value,
        betId: bet.id.value,
        playerId: playerId.value,
        username: input.username,
        stakedAmountCents: amount.toCentsString(),
      };
      const event = new BetPlacedDomainEvent(payload);
      await this.eventBroker.client.publish(event);

      return Output.success({
        bet,
        round,
        balanceCents,
        availableCents: (BigInt(availableCents) - amount.cents).toString(),
      });
    } catch (error) {
      this.logger.error("Failed to place bet", error as Error);
      return Output.fail({
        message: "Internal error while placing bet.",
        statusCode: 500,
      });
    }
  }
}
