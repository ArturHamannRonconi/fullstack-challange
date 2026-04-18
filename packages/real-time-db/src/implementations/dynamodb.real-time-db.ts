import { Injectable } from "@nestjs/common";

import type { IRealTimeDb } from "../interfaces/real-time-db.interface";

@Injectable()
export class DynamoDbRealTimeDb implements IRealTimeDb {
  async get(_key: string): Promise<string | null> {
    throw new Error("DynamoDbRealTimeDb not implemented.");
  }

  async set(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {
    throw new Error("DynamoDbRealTimeDb not implemented.");
  }

  async del(..._keys: string[]): Promise<void> {
    throw new Error("DynamoDbRealTimeDb not implemented.");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("DynamoDbRealTimeDb not implemented.");
  }
}
