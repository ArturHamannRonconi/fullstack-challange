import { Inject, Injectable } from "@nestjs/common";
import {
  DomainEvent,
  DomainEventName,
  DomainHandler,
  EVENT_BROKER_PROVIDER,
  type IEventBroker,
  MicroServiceName,
  type StartGamePayload,
} from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { StartGameService } from "../../application/services/start-game/start-game.service";

@Injectable()
export class StartGameDomainHandler extends DomainHandler<StartGamePayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly service: StartGameService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.StartGame, MicroServiceName.Games);
  }

  async handle(event: DomainEvent<StartGamePayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    const out = await this.service.execute(event.payload);
    if (out.isFailure) return;

    await this.db.set(key, "1", 86400);
  }
}
