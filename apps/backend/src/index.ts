import { app } from "./app.ts";
import { env } from "./env.ts";

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`[backend] listening on http://localhost:${server.port}`);
