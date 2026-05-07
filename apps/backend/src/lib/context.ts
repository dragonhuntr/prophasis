import type { auth } from "@repo/auth";
import type { Logger } from "./logger.ts";

export type AppVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
  requestId: string;
  logger: Logger;
};

export type AppEnv = { Variables: AppVariables };
