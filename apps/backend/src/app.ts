import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./lib/context.ts";
import { authContext } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/error.ts";
import { httpLog } from "./middleware/httpLog.ts";
import { requestId } from "./middleware/requestId.ts";
import { authRoutes } from "./routes/auth.ts";
import { healthRoutes } from "./routes/health.ts";
import { meRoutes } from "./routes/me.ts";
import { postRoutes } from "./routes/posts.ts";

export const app = new Hono<AppEnv>();

app.use("*", requestId);
app.use("*", httpLog);
app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", authContext);

app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/me", meRoutes);
app.route("/api/posts", postRoutes);

app.onError(errorHandler);

export type AppType = typeof app;
