#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { $ } from "bun";

const repoRoot = resolve(import.meta.dir, "..");
process.chdir(repoRoot);

const projectName =
  basename(repoRoot)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "my-app";

console.log(`\n>>> Initializing template for project: ${projectName}\n`);

// 1. Update root package.json name and remove the bun-create hook
const rootPkgPath = resolve(repoRoot, "package.json");
const { "bun-create": _removed, ...rootPkg } = await Bun.file(rootPkgPath).json();
const updatedPkg = { ...rootPkg, name: projectName };
await Bun.write(rootPkgPath, `${JSON.stringify(updatedPkg, null, 2)}\n`);
console.log(`  ✓ root package.json -> name=${projectName}`);

// 2. Write .env from .env.example with a fresh BETTER_AUTH_SECRET
const envPath = resolve(repoRoot, ".env");
if (!existsSync(envPath)) {
  const example = await Bun.file(resolve(repoRoot, ".env.example")).text();
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secretBase64 = Buffer.from(secretBytes).toString("base64");
  const envContent = example.replace(
    /BETTER_AUTH_SECRET=".*"/,
    `BETTER_AUTH_SECRET="${secretBase64}"`,
  );
  await Bun.write(envPath, envContent);
  console.log("  ✓ wrote .env with fresh BETTER_AUTH_SECRET");
}

// 3. Reset git history
if (existsSync(resolve(repoRoot, ".git"))) {
  await $`rm -rf .git`.quiet();
}
await $`git init -q`;
await $`git add -A`;
await $`git -c user.email=template@local -c user.name=template commit -q -m "chore: initialize from template"`;
console.log("  ✓ initialized fresh git history");

// 4. Remove the init script (template-only artifact)
await $`rm -rf scripts`.quiet();
console.log("  ✓ removed template-only files");

console.log(`
Done! Next steps:

  bun run db:up
  bun run db:migrate
  bun run dev

Then: curl http://localhost:3000/health
`);
