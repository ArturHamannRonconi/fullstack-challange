import type { INestApplication } from "@nestjs/common";
import { Server, type ServerOptions } from "socket.io";
import { IoAdapter } from "@nestjs/platform-socket.io";

/**
 * Defers httpServer lookup to call time (after app.init()) so engine.io's
 * attach() receives a fully initialised server rather than undefined.
 *
 * Also patches any missing EventEmitter methods (Bun's http.Server may not
 * expose `.listeners()` which engine.io reads during attach).
 */
export class LazyIoAdapter extends IoAdapter {
  constructor(private readonly nestApp: INestApplication) {
    super(nestApp);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const httpServer =
      // @ts-expect-error — Nest types this loosely
      this.nestApp.getUnderlyingHttpServer?.() ?? this.nestApp.getHttpServer?.();

    if (httpServer) {
      // Bun compat: engine.io calls server.listeners("request") to save
      // existing handlers before installing its own. Patch if absent.
      const srv = httpServer as Record<string, unknown>;
      if (typeof srv["listeners"] !== "function") {
        srv["listeners"] = (_event: string) => [];
      }

      if (port === 0) {
        return new Server(httpServer as Parameters<typeof Server.prototype.attach>[0], options);
      }
    }

    return new Server(port, options);
  }
}
