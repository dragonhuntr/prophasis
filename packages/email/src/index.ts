import { EmailClient } from "./client.ts";
import { loadEmailEnv } from "./env.ts";

export { EmailClient, EmailError } from "./client.ts";
export type {
  Attachment,
  EmailAddress,
  EmailConfig,
  SendOptions,
  SendResult,
} from "./client.ts";
export { isEmailConfigured } from "./env.ts";

let _instance: EmailClient | undefined;

const getInstance = (): EmailClient => {
  if (!_instance) {
    const env = loadEmailEnv();
    _instance = new EmailClient({
      accountId: env.CF_ACCOUNT_ID,
      apiToken: env.CF_EMAIL_API_TOKEN,
      defaultFrom: env.EMAIL_FROM_NAME
        ? { address: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME }
        : env.EMAIL_FROM,
    });
  }
  return _instance;
};

/**
 * Default email client. Env validation is deferred until the first call,
 * so importing this module won't fail if email env vars aren't set yet.
 */
export const email = new Proxy({} as EmailClient, {
  get(_target, prop) {
    const target = getInstance();
    const value = Reflect.get(target, prop);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
