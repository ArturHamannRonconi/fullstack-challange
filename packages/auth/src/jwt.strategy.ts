import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AUTH_MODULE_OPTIONS } from "./auth.constants";
import type { AuthModuleOptions, AuthenticatedUser, TokenPayload } from "./types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(AUTH_MODULE_OPTIONS) options: AuthModuleOptions) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: options.jwksRequestsPerMinute ?? 10,
        jwksUri: options.jwksUri,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: options.issuer,
      audience: options.audience,
      algorithms: ["RS256"],
    });
  }

  validate(payload: TokenPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles ?? [],
    };
  }
}
