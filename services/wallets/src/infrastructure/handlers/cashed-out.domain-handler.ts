import { Inject, Injectable } from "@nestjs/common";
import {
  type CashedOutPayload,
  DomainEvent,
  DomainEventName,
  DomainHandler,
  EVENT_BROKER_PROVIDER,
  type IEventBroker,
  MicroServiceName,
} from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { SettleCashedOutService } from "../../application/services/settle-cashed-out/settle-cashed-out.service";

@Injectable()
export class CashedOutDomainHandler extends DomainHandler<CashedOutPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly service: SettleCashedOutService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.CashedOut, MicroServiceName.Wallets);
  }

  async handle(event: DomainEvent<CashedOutPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    const out = await this.service.execute({
      messageId: event.messageId,
      userId: event.payload.playerId,
      roundId: event.payload.roundId,
      betId: event.payload.betId,
      netProfitCents: event.payload.netProfitCents,
      stakedAmountCents: event.payload.stakedAmountCents,
    });

    if (out.isFailure) return;

    await this.db.set(key, "1", 86400);
  }
}
