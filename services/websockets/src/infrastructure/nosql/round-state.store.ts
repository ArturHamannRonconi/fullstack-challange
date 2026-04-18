import { Inject, Injectable } from "@nestjs/common";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

const CRASH_KEY = (roundId: string) => `round:${roundId}:crash_point_scaled`;
const STARTED_AT_KEY = (roundId: string) => `round:${roundId}:started_at_ms`;
const KEY_TTL_SECONDS = 600;

/**
 * Volatile lookup shared between the websockets orchestrator (writes
 * startedAt) and the games service (reads crashPoint for cashout math).
 * Games owns crash point; WS owns startedAt.
 */
@Injectable()
export class RoundStateStore {
  constructor(@Inject(REAL_TIME_DB) private readonly db: IRealTimeDb) {}

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
}
