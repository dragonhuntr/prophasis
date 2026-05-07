import { loadEnv } from "@repo/config";
import { z } from "zod";

const Schema = z.object({
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
  BETTER_AUTH_URL: z.string().url(),
});

export const authEnv = loadEnv(Schema);
