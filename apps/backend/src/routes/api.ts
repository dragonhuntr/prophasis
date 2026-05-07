import { Hono } from "hono";
import type { AppEnv } from "../lib/context.ts";
import { authRoutes } from "./auth.ts";
import { meRoutes } from "./me.ts";
import { postRoutes } from "./posts.ts";

export const apiRoutes = new Hono<AppEnv>()
  .route("/auth", authRoutes)
  .route("/me", meRoutes)
  .route("/posts", postRoutes);
