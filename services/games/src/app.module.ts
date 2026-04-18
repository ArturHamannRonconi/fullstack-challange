import { AuthModule } from "@crash/auth";
import { EVENT_BROKER_PROVIDER, MicroServiceName, RabbitMQEventBroker } from "@crash/events";
import { RealTimeDbModule } from "@crash/real-time-db";
import { Module } from "@nestjs/common";

import { CashoutService } from "./application/services/cashout/cashout.service";
import { GetCurrentRoundService } from "./application/services/get-current-round/get-current-round.service";
import { GetLeaderboardService } from "./application/services/get-leaderboard/get-leaderboard.service";
import { GetMyBetsService } from "./application/services/get-my-bets/get-my-bets.service";
import { GetRoundsHistoryService } from "./application/services/get-rounds-history/get-rounds-history.service";
import { PlaceBetService } from "./application/services/place-bet/place-bet.service";
import { PrepareRoundService } from "./application/services/prepare-round/prepare-round.service";
import { ProcessCrashService } from "./application/services/process-crash/process-crash.service";
import { StartGameService } from "./application/services/start-game/start-game.service";
import { VerifyRoundService } from "./application/services/verify-round/verify-round.service";
import { BetMapper } from "./infrastructure/database/mappers/bet.mapper";
import { RoundMapper } from "./infrastructure/database/mappers/round.mapper";
import { RoundStatusMapper } from "./infrastructure/database/mappers/round-status.mapper";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/database/repositories/prisma.round.repository";
import { ROUND_REPOSITORY } from "./infrastructure/database/repositories/round.repository";
import { CrashedDomainHandler } from "./infrastructure/handlers/crashed.domain-handler";
import { PrepareRoundDomainHandler } from "./infrastructure/handlers/prepare-round.domain-handler";
import { StartGameDomainHandler } from "./infrastructure/handlers/start-game.domain-handler";
import { RoundStateStore } from "./infrastructure/nosql/round-state.store";
import { CashoutController } from "./presentation/controllers/cashout.controller";
import { GetCurrentRoundController } from "./presentation/controllers/get-current-round.controller";
import { GetLeaderboardController } from "./presentation/controllers/get-leaderboard.controller";
import { GetMyBetsController } from "./presentation/controllers/get-my-bets.controller";
import { GetRoundsHistoryController } from "./presentation/controllers/get-rounds-history.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { PlaceBetController } from "./presentation/controllers/place-bet.controller";
import { VerifyRoundController } from "./presentation/controllers/verify-round.controller";
import { RoundResponseMapper } from "./presentation/mappers/round-response.mapper";

@Module({
  imports: [
    AuthModule.forRoot({
      issuer: process.env.KEYCLOAK_ISSUER!,
      audience: process.env.KEYCLOAK_AUDIENCE!,
      jwksUri: process.env.KEYCLOAK_JWKS_URI!,
    }),
    RealTimeDbModule,
  ],
  controllers: [
    HealthController,
    GetCurrentRoundController,
    GetRoundsHistoryController,
    GetLeaderboardController,
    VerifyRoundController,
    GetMyBetsController,
    PlaceBetController,
    CashoutController,
  ],
  providers: [
    {
      provide: EVENT_BROKER_PROVIDER,
      useValue: new RabbitMQEventBroker(MicroServiceName.Games),
    },
    PrismaService,
    RoundStateStore,
    BetMapper,
    RoundStatusMapper,
    RoundMapper,
    RoundResponseMapper,
    { provide: ROUND_REPOSITORY, useClass: PrismaRoundRepository },
    PrepareRoundService,
    StartGameService,
    ProcessCrashService,
    GetCurrentRoundService,
    GetRoundsHistoryService,
    GetLeaderboardService,
    VerifyRoundService,
    GetMyBetsService,
    PlaceBetService,
    CashoutService,
    PrepareRoundDomainHandler,
    StartGameDomainHandler,
    CrashedDomainHandler,
  ],
})
export class AppModule {}
