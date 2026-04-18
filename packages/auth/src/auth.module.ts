import { Module,DynamicModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PassportModule } from "@nestjs/passport";
import { AUTH_MODULE_OPTIONS } from "./auth.constants";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "./jwt.strategy";
import type { AuthModuleOptions } from "./types";

@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      providers: [
        { provide: AUTH_MODULE_OPTIONS, useValue: options },
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
      exports: [PassportModule],
    };
  }
}
