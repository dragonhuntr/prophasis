import { auth } from "@repo/auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/context.ts";

export const authContext = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }, 401);
  }
  await next();
});
