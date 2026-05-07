import { loadEnv } from "@repo/config";
import { z } from "zod";

const Schema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

export const redisEnv = loadEnv(Schema);
