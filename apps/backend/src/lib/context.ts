import type { Auth } from "@repo/auth/server";
import type { Logger } from "./logger.ts";

type SessionData = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export type AppVariables = {
  user: NonNullable<SessionData>["user"] | null;
  session: NonNullable<SessionData>["session"] | null;
  requestId: string;
  logger: Logger;
};

export type AppEnv = { Variables: AppVariables };
