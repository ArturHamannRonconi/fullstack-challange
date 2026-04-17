import { AuthModule } from "@crash/auth";
import { Module } from "@nestjs/common";

import { CreateWalletService } from "./application/services/create-wallet/create-wallet.service";
import { DepositService } from "./application/services/deposit/deposit.service";
import { GetMyWalletService } from "./application/services/get-my-wallet/get-my-wallet.service";
import { WithdrawService } from "./application/services/withdraw/withdraw.service";
import { OperationMapper } from "./infrastructure/database/mappers/operation.mapper";
import { ReserveMapper } from "./infrastructure/database/mappers/reserve.mapper";
import { WalletMapper } from "./infrastructure/database/mappers/wallet.mapper";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { PrismaWalletRepository } from "./infrastructure/database/repositories/prisma.wallet.repository";
import { WALLET_REPOSITORY } from "./infrastructure/database/repositories/wallet.repository";
import { CreateWalletController } from "./presentation/controllers/create-wallet.controller";
import { DepositController } from "./presentation/controllers/deposit.controller";
import { GetMyWalletController } from "./presentation/controllers/get-my-wallet.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { WithdrawController } from "./presentation/controllers/withdraw.controller";
import { WalletResponseMapper } from "./presentation/mappers/wallet-response.mapper";

@Module({
  imports: [
    AuthModule.forRoot({
      issuer: process.env.KEYCLOAK_ISSUER!,
      audience: process.env.KEYCLOAK_AUDIENCE!,
      jwksUri: process.env.KEYCLOAK_JWKS_URI!,
    }),
  ],
  controllers: [
    HealthController,
    CreateWalletController,
    GetMyWalletController,
    DepositController,
    WithdrawController,
  ],
  providers: [
    PrismaService,
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
  ],
})
export class AppModule {}
