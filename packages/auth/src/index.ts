import { prisma } from "@repo/db";
import { email, isEmailConfigured } from "@repo/email";
import { logger } from "@repo/logger";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { authEnv } from "./env.ts";

const emailEnabled = isEmailConfigured();
if (!emailEnabled) {
  logger.warn(
    { pkg: "@repo/auth" },
    "email not configured (CF_ACCOUNT_ID / CF_EMAIL_API_TOKEN / EMAIL_FROM) — password reset is disabled",
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: authEnv.BETTER_AUTH_SECRET,
  baseURL: authEnv.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    ...(emailEnabled && {
      sendResetPassword: async ({ user, url }) => {
        await email.send({
          to: user.email,
          subject: "Reset your password",
          html: `<p>Hi${user.name ? ` ${user.name}` : ""},</p>
<p>You requested a password reset. Click the link below to set a new password — it will expire shortly.</p>
<p><a href="${url}">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
          text: `Hi${user.name ? ` ${user.name}` : ""},

You requested a password reset. Open this link to set a new password (it will expire shortly):

${url}

If you didn't request this, you can safely ignore this email.`,
        });
      },
    }),
  },
  plugins: [bearer()],
});

export type Auth = typeof auth;
