import { Hono } from "hono";
import type { AppEnv } from "../lib/context.ts";

export const healthRoutes = new Hono<AppEnv>().get("/", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);
