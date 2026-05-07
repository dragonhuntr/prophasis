# Bun Monorepo Template

An opinionated, batteries-included Bun monorepo template with a working backend.

**Stack:** Bun · TypeScript · Hono · Prisma · PostgreSQL 18 + pgvector · better-auth · Zod · Biome.

## Use this template

````bash
bun create <github-user>/<this-repo> my-app
cd my-app
bun run db:up
bun run db:migrate
bun run dev
````

If `bun create` does not run the post-install script automatically, run it once manually:

````bash
bun install
bun run scripts/init-template.ts
````

This will rename packages, generate a fresh `BETTER_AUTH_SECRET`, reset git history, and remove template-only files.

## Layout

```
.
├── apps/
│   └── backend/          # Hono on Bun.serve
└── packages/
    ├── db/               # Prisma + pgvector (single source of truth)
    ├── auth/             # better-auth instance + client factory
    ├── types/            # Shared Zod schemas (subpath exports: @repo/types/api)
    └── config/           # Shared env loader + tsconfig presets
```

## Conventions

- Internal packages are scoped `@repo/*` and imported via `workspace:*`.
- Apps depend on packages; packages do not depend on apps.
- All env reads go through `@repo/config`'s Zod-validated `loadEnv`.
- API request/response schemas live in `@repo/types/api` and are imported by both the backend (for validation) and any future client (for inferred types).
- The Prisma client is a singleton exported from `@repo/db`; only this package imports `@prisma/client`.
- Lint and format with **Biome**: `bun run lint` / `bun run lint:fix` / `bun run format`. Recommended editor extension: `biomejs.biome`.

## Common commands

| Command | What it does |
|---|---|
| `bun run dev` | Start backend in `--hot` mode |
| `bun run db:up` / `db:down` | Start/stop Postgres via docker compose |
| `bun run db:migrate` | `prisma migrate dev` |
| `bun run db:studio` | Open Prisma Studio |
| `bun run db:reset` | Drop + recreate the database (destructive) |
| `bun run lint` / `lint:fix` | Run Biome |
| `bun run format` | Format with Biome |

## Environment

Copy `.env.example` to `.env`. Required variables:

- `DATABASE_URL` — Postgres connection string (matches the docker-compose user/db).
- `PORT` — backend HTTP port (default 3000).
- `BETTER_AUTH_SECRET` — random 32-byte secret. Generate with `openssl rand -base64 32`.
- `BETTER_AUTH_URL` — public URL of the backend (for cookie domain + redirects).

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

Create `apps/<name>/` with its own `package.json` (name it `<name>`, not `@repo/...`) and a `tsconfig.json` extending `tsconfig.base.json`. Add workspace dependencies as needed (e.g., `"@repo/db": "workspace:*"`). Run `bun install`.

## What this template intentionally omits

- No tests, CI, or deployment configs.
- No frontend, mobile, or marketing apps.
- No OAuth, magic links, or 2FA (email + password only).
- No build orchestrator (Turborepo/Nx) — Bun workspaces only.
