import type { MeResponse } from "@repo/types/api";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../lib/context.ts";
import { requireUser } from "../middleware/auth.ts";

export const meRoutes = new Hono<AppEnv>().get("/", requireUser, (c) => {
  const user = c.var.user;
  const session = c.var.session;
  if (!user || !session) {
    throw new HTTPException(401, { message: "Sign in required" });
  }
  const body: MeResponse = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
    },
    session: {
      id: session.id,
      expiresAt:
        session.expiresAt instanceof Date ? session.expiresAt.toISOString() : session.expiresAt,
    },
  };
  return c.json(body);
});
