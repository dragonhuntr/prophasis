import { R2Client } from "./client.ts";
import { r2Env } from "./env.ts";

export { R2Client } from "./client.ts";
export type { R2Config } from "./client.ts";

export const r2 = new R2Client({
  accessKeyId: r2Env.R2_ACCESS_KEY_ID,
  secretAccessKey: r2Env.R2_SECRET_ACCESS_KEY,
  accountId: r2Env.R2_ACCOUNT_ID,
  bucketName: r2Env.R2_BUCKET_NAME,
  endpoint: r2Env.R2_ENDPOINT,
});
