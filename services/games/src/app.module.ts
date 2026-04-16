import { AuthModule } from "@crash/auth";
import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [
    AuthModule.forRoot({
      issuer: process.env.KEYCLOAK_ISSUER!,
      audience: process.env.KEYCLOAK_AUDIENCE!,
      jwksUri: process.env.KEYCLOAK_JWKS_URI!,
    }),
  ],
  controllers: [GamesController],
})
export class AppModule {}
