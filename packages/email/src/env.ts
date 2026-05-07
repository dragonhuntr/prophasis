import { loadEnv } from "@repo/config";
import { z } from "zod";

const Schema = z.object({
  CF_ACCOUNT_ID: z.string().min(1),
  CF_EMAIL_API_TOKEN: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string().optional(),
});

// Lazy: validation runs the first time the email singleton is used,
// not at import time. Lets consumers import @repo/email without
// requiring CF email vars to be set if they never actually send mail.
export const loadEmailEnv = (): z.infer<typeof Schema> => loadEnv(Schema);

/**
 * Returns true if the Cloudflare email env vars are present and well-formed.
 * Use this to feature-flag email-dependent functionality (e.g. password reset)
 * so the app still boots when email isn't configured yet.
 */
export const isEmailConfigured = (): boolean => Schema.safeParse(process.env).success;
