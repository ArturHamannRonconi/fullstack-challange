import type { IEventBroker } from "@crash/events";
import { MicroServiceName } from "@crash/events";
import type { IRealTimeDb } from "@crash/real-time-db";

/** In-memory real-time-db implementation — exposes the raw map for assertions. */
export class InMemoryRealTimeDb implements IRealTimeDb {
  readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async del(...keys: string[]): Promise<void> {
    for (const k of keys) this.store.delete(k);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

/**
 * Minimal IEventBroker fake. Handlers call `manager.createQueue` + `client.subscribe`
 * from `onModuleInit`, but we're invoking `handle()` directly, so the no-op
 * implementations below are sufficient.
 */
export function makeFakeBroker(): IEventBroker {
  return {
    microService: MicroServiceName.Games,
    client: {
      publish: async () => {},
      subscribe: async () => {},
      unsubscribe: async () => {},
    },
    manager: {
      connect: async () => {},
      disconnect: async () => {},
      createQueue: async () => {},
    },
  };
}
