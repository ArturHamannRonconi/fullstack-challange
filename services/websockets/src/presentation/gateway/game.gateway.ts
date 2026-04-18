import { Injectable, Logger } from "@nestjs/common";
import {
  OnGatewayInit,
  WebSocketServer,
  ConnectedSocket,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";

import { verify } from "jsonwebtoken";
import { Server, Socket } from "socket.io";

import jwksRsa = require("jwks-rsa");
type JwksClient = ReturnType<typeof jwksRsa>;

export interface AuthedSocket extends Socket {
  data: {
    userId?: string;
    username?: string;
  };
}

const WS_EVENTS = {
  PREPARING: "round:preparing",
  START: "round:start",
  BETTING_OPEN: "round:betting_open",
  BET: "round:bet",
  BETTING_CLOSED: "round:betting_closed",
  GAME_START: "round:game_start",
  TICK: "round:game_tick",
  CASH_OUT: "round:cash_out",
  CRASHED: "round:crashed",
} as const;

@Injectable()
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: "/ws",
  transports: ["websocket", "polling"],
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);
  private jwks?: JwksClient;

  @WebSocketServer()
  server!: Server;

  afterInit(): void {
    const jwksUri = process.env.KEYCLOAK_JWKS_URI;
    if (jwksUri) {
      this.jwks = jwksRsa({
        jwksUri,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
    this.logger.log("Socket.io gateway ready (path=/ws).");
  }

  async handleConnection(@ConnectedSocket() client: AuthedSocket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);

      if (token) {
        const claims = await this
          .verifyToken(token)
          .catch((err) => {
            this.logger.warn(`JWT verify failed: ${(err as Error).message}`);
            return null;
          });

        if (claims) {
          client.data.userId = claims.sub as string | undefined;
          client.data.username =
            (claims.preferred_username as string | undefined) ??
            (claims.name as string | undefined);
        }
      }

      this.logger.log(
        `Client connected (id=${client.id}, user=${client.data.userId ?? "anon"})`,
      );
    } catch (error) {
      this.logger.error("Handshake failed", error as Error);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: AuthedSocket): void {
    this.logger.log(`Client disconnected (id=${client.id})`);
  }

  // ---- Broadcast helpers ----

  broadcastPreparing(): void {
    this.logger.log(`emit ${WS_EVENTS.PREPARING}`);
    this.server.emit(WS_EVENTS.PREPARING, {});
  }

  broadcastStart(payload: { roundId: string; seedHash: string }): void {
    this.logger.log(`emit ${WS_EVENTS.START} roundId=${payload.roundId}`);
    this.server.emit(WS_EVENTS.START, payload);
  }

  broadcastBettingOpen(payload: { closesAtMs: number }): void {
    this.logger.log(`emit ${WS_EVENTS.BETTING_OPEN} closesAt=${payload.closesAtMs}`);
    this.server.emit(WS_EVENTS.BETTING_OPEN, payload);
  }

  broadcastBet(payload: { roundId: string; playerId: string; username?: string; stakedAmount: string }): void {
    this.logger.log(`emit ${WS_EVENTS.BET} roundId=${payload.roundId} playerId=${payload.playerId} amount=${payload.stakedAmount}`);
    this.server.emit(WS_EVENTS.BET, payload);
  }

  broadcastBettingClosed(): void {
    this.logger.log(`emit ${WS_EVENTS.BETTING_CLOSED}`);
    this.server.emit(WS_EVENTS.BETTING_CLOSED, {});
  }

  broadcastGameStart(): void {
    this.logger.log(`emit ${WS_EVENTS.GAME_START}`);
    this.server.emit(WS_EVENTS.GAME_START, {});
  }

  broadcastTick(payload: { multiplier: number }): void {
    this.server.emit(WS_EVENTS.TICK, payload);
  }

  broadcastCashOut(payload: {
    roundId: string;
    playerId: string;
    username?: string;
    multiplier: number;
  }): void {
    this.logger.log(`emit ${WS_EVENTS.CASH_OUT} roundId=${payload.roundId} playerId=${payload.playerId} multiplier=${payload.multiplier}`);
    this.server.emit(WS_EVENTS.CASH_OUT, payload);
  }

  broadcastCrashed(payload: { crashPoint: number }): void {
    this.logger.log(`emit ${WS_EVENTS.CRASHED} crashPoint=${payload.crashPoint}`);
    this.server.emit(WS_EVENTS.CRASHED, payload);
  }

  private verifyToken(token: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      verify(
        token,
        (header, callback) => {
          if (!this.jwks || !header.kid) {
            callback(new Error("JWKS not configured."));
            return;
          }
          this.jwks.getSigningKey(header.kid, (err, key) => {
            if (err || !key) {
              callback(err ?? new Error("JWKS key not found."));
              return;
            }
            callback(null, key.getPublicKey());
          });
        },
        {
          algorithms: ["RS256"],
          audience: process.env.KEYCLOAK_AUDIENCE,
          issuer: process.env.KEYCLOAK_ISSUER,
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded as Record<string, unknown>);
        },
      );
    });
  }
}
