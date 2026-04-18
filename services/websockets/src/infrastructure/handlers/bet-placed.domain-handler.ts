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

import { GameOrchestratorService } from "../../application/orchestrator/game-orchestrator.service";

@Injectable()
export class BetPlacedDomainHandler extends DomainHandler<BetPlacedPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly orchestrator: GameOrchestratorService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(eventBroker, DomainEventName.BetPlaced, MicroServiceName.Websockets);
  }

  async handle(event: DomainEvent<BetPlacedPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    await this.db.set(key, "1", 86400);
    this.orchestrator.onBetPlaced({
      roundId: event.payload.roundId,
      playerId: event.payload.playerId,
      username: event.payload.username,
      stakedAmount: event.payload.stakedAmountCents,
    });
  }
}
