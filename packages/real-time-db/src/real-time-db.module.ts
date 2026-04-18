import { Module } from "@nestjs/common";

import { RedisRealTimeDb } from "./implementations/redis.real-time-db";
import { REAL_TIME_DB } from "./real-time-db.tokens";

@Module({
  providers: [{ provide: REAL_TIME_DB, useClass: RedisRealTimeDb }],
  exports: [REAL_TIME_DB],
})
export class RealTimeDbModule {}
