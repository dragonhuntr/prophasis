import { createAuthClient } from "better-auth/client";

export function makeAuthClient(opts: { baseURL: string }) {
  return createAuthClient({ baseURL: opts.baseURL });
}

export type AuthClient = ReturnType<typeof makeAuthClient>;
