import { z } from "zod";

export const MeResponse = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
  }),
  session: z.object({
    id: z.string(),
    expiresAt: z.string(),
  }),
});
export type MeResponse = z.infer<typeof MeResponse>;
