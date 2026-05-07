import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";
import { CreatePostRequest, type Post } from "@repo/types/api";
import { Hono } from "hono";
import type { AppEnv } from "../lib/context.ts";
import { requireUser } from "../middleware/auth.ts";

export const postRoutes = new Hono<AppEnv>()
  .use("*", requireUser)
  .post("/", zValidator("json", CreatePostRequest), async (c) => {
    const user = c.var.user;
    if (!user) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }, 401);
    }
    const body = c.req.valid("json");
    const created = await prisma.post.create({
      data: {
        title: body.title,
        body: body.body,
        authorId: user.id,
      },
    });
    const response: Post = {
      id: created.id,
      title: created.title,
      body: created.body,
      authorId: created.authorId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
    return c.json(response, 201);
  });
