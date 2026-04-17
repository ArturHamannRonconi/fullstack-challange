import "reflect-metadata";
import {
  CanActivate,
  type ExecutionContext,
  type Provider,
  type Type,
  ValidationPipe,
} from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { IS_PUBLIC_KEY, JwtAuthGuard, type AuthenticatedUser } from "@crash/auth";

// Wire-format parity with production `main.ts`: BigInt must serialize as a string.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON() {
  return this.toString();
};

export const TEST_USER: AuthenticatedUser = {
  userId: "3ae7b3e4-8f10-4e3e-9e92-7b3fbd9e9c42",
  username: "player",
  roles: [],
};

class FakeJwtAuthGuard implements CanActivate {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<{
        user?: AuthenticatedUser;
        headers: Record<string, string | undefined>;
      }>();
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ") || auth === "Bearer invalid") {
      return false;
    }
    req.user = TEST_USER;
    return true;
  }
}

export interface BootOptions {
  controllers: Type<unknown>[];
  providers: Provider[];
}

export async function bootTestApp(
  options: BootOptions,
): Promise<{ app: INestApplication; baseUrl: string }> {
  const moduleRef = await Test.createTestingModule({
    controllers: options.controllers,
    providers: options.providers,
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(FakeJwtAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication({
    logger: process.env.TEST_DEBUG === "1" ? undefined : false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(0);
  const server = app.getHttpServer();
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Failed to bind test app to a port");
  }
  return { app, baseUrl: `http://127.0.0.1:${addr.port}` };
}

export async function http(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

export function bearer(token = "valid-token"): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
