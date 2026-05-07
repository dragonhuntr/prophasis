import { app } from "./app.ts";
import { env } from "./env.ts";
import { logger } from "./lib/logger.ts";

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info({ port: server.port }, "backend listening");
