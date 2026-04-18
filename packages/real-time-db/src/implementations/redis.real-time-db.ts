import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

import type { IRealTimeDb } from "../interfaces/real-time-db.interface";

@Injectable()
export class RedisRealTimeDb implements IRealTimeDb, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRealTimeDb.name);
  private client?: Redis;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? "redis://redis:6379";
    this.client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
    this.client.on("error", (err: Error) => this.logger.error("Redis error", err));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  private getClient(): Redis {
    if (!this.client) throw new Error("RedisRealTimeDb not initialized.");
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.getClient().set(key, value, "EX", ttlSeconds);
    } else {
      await this.getClient().set(key, value);
    }
  }

  async del(...keys: string[]): Promise<void> {
    await this.getClient().del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.getClient().exists(key)) === 1;
  }
}
