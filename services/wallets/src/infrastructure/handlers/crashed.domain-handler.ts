import { Inject, Injectable } from "@nestjs/common";
import {
  type CrashedPayload,
  DomainEvent,
  DomainEventName,
  DomainHandler,
  EVENT_BROKER_PROVIDER,
  type IEventBroker,
  MicroServiceName,
} from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { SettleCrashedService } from "../../application/services/settle-crashed/settle-crashed.service";

@Injectable()
export class CrashedDomainHandler extends DomainHandler<CrashedPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly service: SettleCrashedService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.Crashed, MicroServiceName.Wallets);
  }

  async handle(event: DomainEvent<CrashedPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    const out = await this.service.execute({
      messageId: event.messageId,
      roundId: event.payload.roundId,
    });

    if (out.isFailure) return;

    await this.db.set(key, "1", 86400);
  }
}
