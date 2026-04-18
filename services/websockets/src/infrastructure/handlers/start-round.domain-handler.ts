import { Inject, Injectable } from "@nestjs/common";
import { DomainEvent, DomainEventName, DomainHandler, EVENT_BROKER_PROVIDER, type IEventBroker, MicroServiceName, type StartRoundPayload } from "@crash/events";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { GameOrchestratorService } from "../../application/orchestrator/game-orchestrator.service";

@Injectable()
export class StartRoundDomainHandler extends DomainHandler<StartRoundPayload> {
  constructor(
    @Inject(EVENT_BROKER_PROVIDER) eventBroker: IEventBroker,
    private readonly orchestrator: GameOrchestratorService,
    @Inject(REAL_TIME_DB) private readonly db: IRealTimeDb,
  ) {
    super(
      eventBroker,
      DomainEventName.StartRound,
      MicroServiceName.Websockets,
    );
  }

  async handle(event: DomainEvent<StartRoundPayload>): Promise<void> {
    const key = `inbox:${event.messageId}`;
    if (await this.db.exists(key)) return;

    await this.db.set(key, "1", 86400);
    this.orchestrator.onStartRound(event.payload);
  }
}
