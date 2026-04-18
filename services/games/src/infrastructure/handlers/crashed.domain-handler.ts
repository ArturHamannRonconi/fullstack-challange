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

import { ProcessCrashService } from "../../application/services/process-crash/process-crash.service";

@Injectable()
export class CrashedDomainHandler extends DomainHandler<CrashedPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly service: ProcessCrashService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.Crashed, MicroServiceName.Games);
  }

  async handle(event: DomainEvent<CrashedPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    const out = await this.service.execute({ roundId: event.payload.roundId });
    if (out.isFailure) return;

    await this.db.set(key, "1", 86400);
  }
}
