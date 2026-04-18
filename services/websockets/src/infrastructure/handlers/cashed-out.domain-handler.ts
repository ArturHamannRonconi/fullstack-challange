import { Inject, Injectable } from "@nestjs/common";
import {
  DomainEvent,
  type IEventBroker,
  DomainHandler,
  DomainEventName,
  type CashedOutPayload,
  MicroServiceName,
  EVENT_BROKER_PROVIDER,
} from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { GameOrchestratorService } from "../../application/orchestrator/game-orchestrator.service";

@Injectable()
export class CashedOutDomainHandler extends DomainHandler<CashedOutPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly orchestrator: GameOrchestratorService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.CashedOut, MicroServiceName.Websockets);
  }

  async handle(event: DomainEvent<CashedOutPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    await this.db.set(key, "1", 86400);
    const multiplier = Number(event.payload.multiplierScaled) / 10_000;
    this.orchestrator.onCashedOut({
      roundId: event.payload.roundId,
      playerId: event.payload.playerId,
      username: event.payload.username,
      multiplier,
    });
  }
}
