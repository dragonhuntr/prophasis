import { loadEnv } from "@repo/config";
import { z } from "zod";

const Schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  BETTER_AUTH_URL: z.string().url(),
});

export const env = loadEnv(Schema);
