import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppEnv } from "./lib/context.ts";
import { authContext } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/error.ts";
import { authRoutes } from "./routes/auth.ts";
import { healthRoutes } from "./routes/health.ts";
import { meRoutes } from "./routes/me.ts";

export const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", authContext);

app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/me", meRoutes);

app.onError(errorHandler);

export type AppType = typeof app;
