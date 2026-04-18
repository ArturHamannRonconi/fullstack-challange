import { Inject, Injectable } from "@nestjs/common";
import {
  DomainEvent,
  DomainEventName,
  DomainHandler,
  EVENT_BROKER_PROVIDER,
  type IEventBroker,
  MicroServiceName,
  type PrepareRoundPayload,
} from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { PrepareRoundService } from "../../application/services/prepare-round/prepare-round.service";

@Injectable()
export class PrepareRoundDomainHandler extends DomainHandler<PrepareRoundPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly prepareRoundService: PrepareRoundService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.PrepareRound, MicroServiceName.Games);
  }

  async handle(event: DomainEvent<PrepareRoundPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    const output = await this.prepareRoundService.execute({ messageId: event.messageId });
    if (output.isFailure) return;

    await this.db.set(key, "1", 86400);
  }
}
