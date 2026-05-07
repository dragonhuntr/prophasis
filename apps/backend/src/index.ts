import { prisma } from "@repo/db";
import { app } from "./app.ts";
import { env } from "./env.ts";
import { logger } from "./lib/logger.ts";

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info({ port: server.port }, "backend listening");

const shutdown = async (signal: string) => {
  logger.info({ signal }, "shutdown initiated");
  try {
    await server.stop(false); // wait for in-flight requests to finish
    await prisma.$disconnect();
    logger.info("shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "shutdown failed");
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
