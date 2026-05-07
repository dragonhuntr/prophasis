import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.ts";
import type { AppEnv } from "./lib/context.ts";
import { authContext } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/error.ts";
import { httpLog } from "./middleware/httpLog.ts";
import { requestId } from "./middleware/requestId.ts";
import { apiRoutes } from "./routes/api.ts";
import { healthRoutes } from "./routes/health.ts";

export const app = new Hono<AppEnv>()
  .use("*", requestId)
  .use("*", httpLog)
  .use(
    "*",
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["x-request-id"],
      maxAge: 600,
    }),
  )
  .use("*", authContext)
  .route("/health", healthRoutes)
  .route("/api", apiRoutes)
  .onError(errorHandler);

export type AppType = typeof app;
