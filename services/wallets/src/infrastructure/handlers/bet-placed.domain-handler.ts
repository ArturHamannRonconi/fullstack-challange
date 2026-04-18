import { Inject, Injectable } from "@nestjs/common";
import {
  type BetPlacedPayload,
  DomainEvent,
  DomainEventName,
  DomainHandler,
  EVENT_BROKER_PROVIDER,
  type IEventBroker,
  MicroServiceName,
} from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { ReserveFundsService } from "../../application/services/reserve-funds/reserve-funds.service";

@Injectable()
export class BetPlacedDomainHandler extends DomainHandler<BetPlacedPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly service: ReserveFundsService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.BetPlaced, MicroServiceName.Wallets);
  }

  async handle(event: DomainEvent<BetPlacedPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    const out = await this.service.execute({
      messageId: event.messageId,
      userId: event.payload.playerId,
      roundId: event.payload.roundId,
      betId: event.payload.betId,
      amountCents: event.payload.stakedAmountCents,
    });

    if (out.isFailure) return;

    await this.db.set(key, "1", 86400);
  }
}
