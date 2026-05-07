import { logger as rootLogger } from "@repo/logger";
import type { Context, ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { AppEnv } from "../lib/context.ts";

export const errorHandler: ErrorHandler<AppEnv> = (err, c: Context<AppEnv>) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: err.issues,
        },
      },
      400,
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: err.status === 401 ? "UNAUTHORIZED" : "HTTP_ERROR",
          message: err.message,
        },
      },
      err.status,
    );
  }

  const log = c.var.logger ?? rootLogger;
  log.error({ err }, "unhandled error");
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
    500,
  );
};
