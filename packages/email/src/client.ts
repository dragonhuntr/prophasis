import { logger as rootLogger } from "@repo/logger";

const logger = rootLogger.child({ pkg: "@repo/email" });

export type EmailAddress = string | { address: string; name: string };

export interface Attachment {
  filename: string;
  /** base64-encoded content */
  content: string;
  /** MIME type, e.g. "application/pdf" */
  type: string;
  disposition?: "attachment" | "inline";
}

export interface SendOptions {
  to: string | string[];
  /** Falls back to the client's `defaultFrom` if omitted. */
  from?: EmailAddress;
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: Attachment[];
}

export interface SendResult {
  delivered: string[];
  permanentBounces: string[];
  queued: string[];
}

export interface EmailConfig {
  accountId: string;
  apiToken: string;
  defaultFrom?: EmailAddress;
}

interface CloudflareError {
  code: number;
  message: string;
}

interface CloudflareResponse {
  success: boolean;
  errors: CloudflareError[];
  messages: unknown[];
  result: {
    delivered?: string[];
    permanent_bounces?: string[];
    queued?: string[];
  } | null;
}

export class EmailError extends Error {
  public readonly errors: CloudflareError[];
  public readonly status: number;

  constructor(message: string, errors: CloudflareError[], status: number) {
    super(message);
    this.name = "EmailError";
    this.errors = errors;
    this.status = status;
  }
}

export class EmailClient {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly defaultFrom?: EmailAddress;

  public constructor(config: EmailConfig) {
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.defaultFrom = config.defaultFrom;
  }

  public async send(options: SendOptions): Promise<SendResult> {
    const from = options.from ?? this.defaultFrom;
    if (!from) {
      throw new EmailError("No `from` address provided and no defaultFrom configured", [], 0);
    }

    const body: Record<string, unknown> = {
      to: options.to,
      from,
      subject: options.subject,
      ...(options.html && { html: options.html }),
      ...(options.text && { text: options.text }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.replyTo && { reply_to: options.replyTo }),
      ...(options.headers && { headers: options.headers }),
      ...(options.attachments && { attachments: options.attachments }),
    };

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/email/sending/send`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.error({ err }, "email send: network error");
      throw new EmailError(
        `Email send failed: ${err instanceof Error ? err.message : String(err)}`,
        [],
        0,
      );
    }

    let json: CloudflareResponse;
    try {
      json = (await res.json()) as CloudflareResponse;
    } catch (err) {
      logger.error({ err, status: res.status }, "email send: invalid JSON response");
      throw new EmailError(
        `Email send failed (HTTP ${res.status}): non-JSON response`,
        [],
        res.status,
      );
    }

    if (!json.success) {
      const message = json.errors[0]?.message ?? `Email send failed (HTTP ${res.status})`;
      logger.error({ errors: json.errors, status: res.status }, "email send failed");
      throw new EmailError(message, json.errors, res.status);
    }

    const result: SendResult = {
      delivered: json.result?.delivered ?? [],
      permanentBounces: json.result?.permanent_bounces ?? [],
      queued: json.result?.queued ?? [],
    };

    logger.info(
      { to: options.to, delivered: result.delivered.length, queued: result.queued.length },
      "email sent",
    );

    return result;
  }
}
