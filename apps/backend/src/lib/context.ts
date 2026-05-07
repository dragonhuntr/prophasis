import type { Auth } from "@repo/auth/server";

type SessionData = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export type AppVariables = {
  user: NonNullable<SessionData>["user"] | null;
  session: NonNullable<SessionData>["session"] | null;
};

export type AppEnv = { Variables: AppVariables };
