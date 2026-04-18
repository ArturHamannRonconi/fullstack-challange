import { Inject, Injectable } from "@nestjs/common";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

const CRASH_KEY = (roundId: string) => `round:${roundId}:crash_point_scaled`;
const STARTED_AT_KEY = (roundId: string) => `round:${roundId}:started_at_ms`;
/** Short TTL so keys eventually expire even if a round crashes without cleanup. */
const KEY_TTL_SECONDS = 600;

/**
 * Volatile lookup for in-flight round state. Source of truth is Postgres,
 * but tick calculations need low-latency reads of `crashPointScaled` and
 * `startedAtMs` — hence Redis.
 */
@Injectable()
export class RoundStateStore {
  constructor(@Inject(REAL_TIME_DB) private readonly db: IRealTimeDb) {}

  async setCrashPointScaled(roundId: string, scaled: number): Promise<void> {
    await this.db.set(CRASH_KEY(roundId), String(scaled), KEY_TTL_SECONDS);
  }

  async getCrashPointScaled(roundId: string): Promise<number | null> {
    const value = await this.db.get(CRASH_KEY(roundId));
    return value === null ? null : Number(value);
  }

  async setStartedAtMs(roundId: string, ms: number): Promise<void> {
    await this.db.set(STARTED_AT_KEY(roundId), String(ms), KEY_TTL_SECONDS);
  }

  async getStartedAtMs(roundId: string): Promise<number | null> {
    const value = await this.db.get(STARTED_AT_KEY(roundId));
    return value === null ? null : Number(value);
  }

  async clearRound(roundId: string): Promise<void> {
    await this.db.del(CRASH_KEY(roundId), STARTED_AT_KEY(roundId));
  }
}
