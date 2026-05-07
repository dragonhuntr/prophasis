import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/context.ts";

export const httpLog = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  c.var.logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: ms,
    },
    "request",
  );
});
