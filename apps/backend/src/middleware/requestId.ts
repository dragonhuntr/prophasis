import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/context.ts";
import { logger } from "../lib/logger.ts";

export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const id = incoming ?? crypto.randomUUID();
  c.set("requestId", id);
  c.set("logger", logger.child({ requestId: id }));
  c.header("x-request-id", id);
  await next();
});
