import { auth } from "@repo/auth/server";
import { Hono } from "hono";
import type { AppEnv } from "../lib/context.ts";

export const authRoutes = new Hono<AppEnv>().on(["GET", "POST"], "/*", (c) =>
  auth.handler(c.req.raw),
);
