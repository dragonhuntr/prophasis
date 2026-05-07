# Bun Monorepo Template

An opinionated, batteries-included Bun monorepo template with a working backend.

**Stack:** Bun · TypeScript · Hono · Prisma · PostgreSQL 18 + pgvector · Redis · Cloudflare R2 · Cloudflare Email · better-auth · Zod · Pino · Biome · Lefthook.

## Use this template

````bash
bun create <github-user>/<this-repo> my-app
cd my-app
docker compose up -d
bun run db:migrate
bun run dev
````

If `bun create` does not run the post-install script automatically, run it once manually:

````bash
bun install
bun run scripts/init-template.ts
````

This will rename packages, generate a fresh `BETTER_AUTH_SECRET`, reset git history, install lefthook hooks, and remove template-only files.

## Layout

```
.
├── apps/
│   └── backend/          # Hono on Bun.serve — REST + auth + middleware stack
└── packages/
    ├── auth/             # better-auth instance (email+password, cookie + bearer)
    ├── config/           # Zod-validated env loader + tsconfig presets
    ├── db/               # Prisma client + schema (pgvector enabled)
    ├── email/            # Cloudflare Email Service REST client (optional)
    ├── logger/           # Pino logger (dev pretty / prod JSON)
    ├── r2/               # Cloudflare R2 (S3-compatible) client + singleton
    ├── redis/            # ioredis singleton + BullMQ-ready connection factory
    └── types/            # Shared Zod schemas (subpath exports: @repo/types/api)
```

## Conventions

- Internal packages are scoped `@repo/*` and imported via `workspace:*`.
- Apps depend on packages; packages do not depend on apps.
- All env reads go through `@repo/config`'s Zod-validated `loadEnv`.
- API request/response schemas live in `@repo/types/api` and are imported by both the backend (for validation) and any future client (for inferred types).
- The Prisma client is a singleton exported from `@repo/db`; only this package imports `@prisma/client`.
- The Redis client is a singleton exported from `@repo/redis`; use `createBullConnection()` for BullMQ queues/workers (preset with `maxRetriesPerRequest: null`).
- The R2 client is a singleton exported from `@repo/r2` (`r2`); construct additional buckets with `new R2Client({...})`. Presigned URLs default to a 15-minute TTL; large file uploads (>10MB) auto-switch to multipart.
- The email client is a singleton exported from `@repo/email` (`email.send({...})`) backed by the Cloudflare Email Service REST API. Env validation is **lazy** — importing the package doesn't require setup. Use `isEmailConfigured()` to feature-flag email-dependent code; `@repo/auth` already does this for password reset.
- Logging goes through `@repo/logger`. The backend's `requestId` middleware injects a child logger into the Hono context — `c.var.logger` carries the request id.
- Lint and format with **Biome**: `bun run lint` / `bun run lint:fix` / `bun run format`. Pre-commit hooks (Lefthook) run Biome on staged files and re-stage fixes automatically.

## Common commands

| Command | What it does |
|---|---|
| `bun run dev` | Start backend in `--hot` mode |
| `bun run db:up` / `db:down` | Start/stop Postgres via docker compose |
| `bun run db:migrate` | `prisma migrate dev` |
| `bun run db:deploy` | Apply migrations without prompts (CI/prod) |
| `bun run db:studio` | Open Prisma Studio |
| `bun run db:reset` | Drop + recreate the database (destructive) |
| `bun run lint` / `lint:fix` | Run Biome |
| `bun run format` | Format with Biome |
| `bun run typecheck` | Workspace-wide `tsc --noEmit` |
| `bun run check` | Lint + typecheck (CI gate) |
| `docker compose up -d` | Start Postgres **and** Redis |

## Environment

Copy `.env.example` to `.env`. Required variables:

- `DATABASE_URL` — Postgres connection string (matches the docker-compose user/db).
- `REDIS_URL` — Redis connection string (defaults to `redis://localhost:6379`).
- `PORT` — backend HTTP port (default 3000).
- `LOG_LEVEL` — Pino level: `trace` / `debug` / `info` / `warn` / `error`. Defaults to `debug` in dev, `info` in prod.
- `BETTER_AUTH_SECRET` — random 32-byte secret. Generate with `openssl rand -base64 32`.
- `BETTER_AUTH_URL` — public URL of the backend (for cookie domain + redirects).
- `ALLOWED_ORIGINS` — comma-separated list of CORS origins. Empty = same-origin only. Browsers reject `*` when credentials are sent, so list every origin explicitly.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` — Cloudflare R2 credentials. Required only if you import `@repo/r2`. `R2_ENDPOINT` is optional (defaults to `https://<account>.r2.cloudflarestorage.com`).
- `CF_ACCOUNT_ID`, `CF_EMAIL_API_TOKEN`, `EMAIL_FROM` — Cloudflare Email Service credentials. **Optional**: if unset, `@repo/email` still imports cleanly but sends throw, and `@repo/auth` disables password-reset email (logs a warning at startup). `EMAIL_FROM_NAME` is optional.

## Backend features

- **Hono router** chained from `apps/backend/src/app.ts`, mounted under `/api/*` with `/health` at the root.
- **better-auth** with email+password, both cookie and bearer-token sessions. Auth handler is mounted at `/api/auth/*`; `authContext` middleware populates `c.var.user` / `c.var.session`.
- **Request-scoped logging** — every request gets an `x-request-id` (round-trips via response header) and a child logger; `httpLog` middleware emits structured access logs with method, path, status, durationMs.
- **Validation** with `@hono/zod-validator` against schemas from `@repo/types/api`.
- **Error handler** maps `ZodError` → 400, `HTTPException` → its status, anything else → 500 with structured logging.
- **Graceful shutdown** on `SIGTERM` / `SIGINT` — drains in-flight requests then disconnects Prisma.

## Adding a new shared types namespace

Create `packages/types/src/<namespace>/index.ts`, then add an entry to `packages/types/package.json`:

```json
"exports": {
  "./api": "./src/api/index.ts",
  "./<namespace>": "./src/<namespace>/index.ts"
}
```

Consumers import as `import { ... } from "@repo/types/<namespace>"`.

## Adding a new app

Create `apps/<name>/` with its own `package.json` (name it `<name>`, not `@repo/...`) and a `tsconfig.json` extending `tsconfig.base.json`. Add workspace dependencies as needed (e.g., `"@repo/db": "workspace:*"`, `"@repo/logger": "workspace:*"`). Run `bun install`.

## What this template intentionally omits

- No tests, CI, or deployment configs (Dockerfile, GitHub Actions).
- No frontend, mobile, or marketing apps.
- No OAuth, magic links, or 2FA (email + password only).
- No OpenAPI generator — schemas are Zod-defined but no `/docs` UI yet.
- No build orchestrator (Turborepo/Nx) — Bun workspaces only.
