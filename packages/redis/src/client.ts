import { Redis, type RedisOptions } from "ioredis";
import { redisEnv } from "./env.ts";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis: Redis =
  globalForRedis.redis ?? new Redis(redisEnv.REDIS_URL, { lazyConnect: true });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// BullMQ requires a dedicated connection with `maxRetriesPerRequest: null`.
// Use this factory when constructing Queue/Worker connections.
export const createBullConnection = (opts: RedisOptions = {}): Redis =>
  new Redis(redisEnv.REDIS_URL, {
    maxRetriesPerRequest: null,
    ...opts,
  });
