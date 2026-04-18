import { AuthModule } from "@crash/auth";
import { RealTimeDbModule } from "@crash/real-time-db";
import { Module } from "@nestjs/common";

import { CreateWalletService } from "./application/services/create-wallet/create-wallet.service";
import { DepositService } from "./application/services/deposit/deposit.service";
import { GetMyWalletService } from "./application/services/get-my-wallet/get-my-wallet.service";
import { ReserveFundsService } from "./application/services/reserve-funds/reserve-funds.service";
import { SettleCashedOutService } from "./application/services/settle-cashed-out/settle-cashed-out.service";
import { SettleCrashedService } from "./application/services/settle-crashed/settle-crashed.service";
import { WithdrawService } from "./application/services/withdraw/withdraw.service";
import { OperationMapper } from "./infrastructure/database/mappers/operation.mapper";
import { ReserveMapper } from "./infrastructure/database/mappers/reserve.mapper";
import { WalletMapper } from "./infrastructure/database/mappers/wallet.mapper";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { PrismaWalletRepository } from "./infrastructure/database/repositories/prisma.wallet.repository";
import { WALLET_REPOSITORY } from "./infrastructure/database/repositories/wallet.repository";
import { BetPlacedDomainHandler } from "./infrastructure/handlers/bet-placed.domain-handler";
import { CashedOutDomainHandler } from "./infrastructure/handlers/cashed-out.domain-handler";
import { CrashedDomainHandler } from "./infrastructure/handlers/crashed.domain-handler";
import { WalletBalanceStore } from "./infrastructure/nosql/wallet-balance.store";
import { CreateWalletController } from "./presentation/controllers/create-wallet.controller";
import { DepositController } from "./presentation/controllers/deposit.controller";
import { GetMyWalletController } from "./presentation/controllers/get-my-wallet.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { ReserveController } from "./presentation/controllers/reserve.controller";
import { WithdrawController } from "./presentation/controllers/withdraw.controller";
import { WalletResponseMapper } from "./presentation/mappers/wallet-response.mapper";
import { EVENT_BROKER_PROVIDER, MicroServiceName, RabbitMQEventBroker } from "@crash/events";

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
    CreateWalletController,
    GetMyWalletController,
    DepositController,
    WithdrawController,
    ReserveController,
  ],
  providers: [
    {
      provide: EVENT_BROKER_PROVIDER,
      useValue: new RabbitMQEventBroker(
        MicroServiceName.Wallets
      ),
    },
    PrismaService,
    WalletBalanceStore,
    OperationMapper,
    ReserveMapper,
    WalletMapper,
    WalletResponseMapper,
    {
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
    CreateWalletService,
    GetMyWalletService,
    DepositService,
    WithdrawService,
    ReserveFundsService,
    SettleCashedOutService,
    SettleCrashedService,
    BetPlacedDomainHandler,
    CashedOutDomainHandler,
    CrashedDomainHandler,
  ],
})
export class AppModule {}
