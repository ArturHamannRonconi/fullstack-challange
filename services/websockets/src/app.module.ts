import { Controller, Get, Module } from "@nestjs/common";
import { EVENT_BROKER_PROVIDER, MicroServiceName, RabbitMQEventBroker } from "@crash/events";
import { RealTimeDbModule } from "@crash/real-time-db";

import { GameGateway } from "./presentation/gateway/game.gateway";
import { RoundStateStore } from "./infrastructure/nosql/round-state.store";
import { GameOrchestratorService } from "./application/orchestrator/game-orchestrator.service";
import { BetPlacedDomainHandler } from "./infrastructure/handlers/bet-placed.domain-handler";
import { CashedOutDomainHandler } from "./infrastructure/handlers/cashed-out.domain-handler";
import { StartRoundDomainHandler } from "./infrastructure/handlers/start-round.domain-handler";

@Controller()
class HealthController {
  @Get("health")
  check() {
    return { status: "ok", service: "websockets" };
  }
}

@Module({
  imports: [RealTimeDbModule],
  controllers: [HealthController],
  providers: [
    {
      provide: EVENT_BROKER_PROVIDER,
      useValue: new RabbitMQEventBroker(
        MicroServiceName.Websockets
      ),
    },
    RoundStateStore,
    GameGateway,
    GameOrchestratorService,
    StartRoundDomainHandler,
    BetPlacedDomainHandler,
    CashedOutDomainHandler,
  ],
})
export class AppModule {}
