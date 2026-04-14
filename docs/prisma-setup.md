# Prisma Setup Guide (Prisma 7.7+ with Supabase + pgvector)

This documents the exact steps taken to get Prisma working in this NX monorepo with Supabase PostgreSQL and pgvector. Written because AI assistants (including Claude) consistently get this wrong.

## Requirements

- `prisma` >= 7.7.0
- `@prisma/client` >= 7.7.0
- `@prisma/adapter-pg` >= 7.7.0
- `pg` >= 8.x

**Use `@prisma/client` 7.7.0 or higher.** Older versions have breaking differences in config file support, driver adapter setup, and extension handling. Do not downgrade.

---

## Common mistakes that WILL break everything

AI assistants (Claude included) repeatedly make these mistakes when setting up Prisma with Supabase. Read this before touching anything.

### 1. Wrong Prisma version

**DO NOT install Prisma versions older than 7.7.0.** Earlier versions (5.x, 6.x, even 7.0–7.6) have fundamentally different APIs:

- `prisma.config.ts` does not exist or works differently.
- Driver adapters (`@prisma/adapter-pg`) require preview feature flags that were removed in 7.7.
- Extension support (`postgresqlExtensions`) behaves differently.
- The `defineConfig` API shape is different.

If you see Claude or any AI suggest installing `prisma@5.x` or `@prisma/client@6.x`, **stop immediately**. The correct versions are:

```json
{
  "prisma": "^7.7.0",
  "@prisma/client": "^7.7.0",
  "@prisma/adapter-pg": "^7.7.0"
}
```

When in doubt, check the current installed versions:
```bash
npx prisma --version
```

### 2. Wrong Supabase connection string

Supabase provides multiple connection URLs. **You must use the Session Pooler (port 5432)**, not the Transaction Pooler or the direct connection.

In Supabase Dashboard -> Project Settings -> Database -> Connection string:

- **Session Pooler (port 5432)** — USE THIS ONE for `DATABASE_URL`. This is the correct pooler for application runtime and Prisma's driver adapter.
- Transaction Pooler (port 6543) — Do NOT use for the app. Only useful for one-off migration scripts if you separate migration URLs.
- Direct connection (port 5432, different host) — Do NOT use. Bypasses connection pooling entirely.

The `DATABASE_URL` in `.env` should look like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

If you use the wrong pooler, you'll get cryptic connection errors, prepared statement conflicts, or silent query failures. The port number is the giveaway: it must be `5432` from the **Session pooler** section.

---

## What was wrong and what was fixed

### 1. Missing `prisma.config.ts` migrations path

The original config had no `migrations` block. Without it, Prisma doesn't know where to store or read migration files.

**Before (broken):**
```ts
export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

**After (working):**
```ts
export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

Key changes:
- Removed `earlyAccess: true` (not needed in Prisma 7.7+).
- Added `migrations.path` pointing to `prisma/migrations/`.

### 2. Missing pgvector extension declaration in schema

Prisma 7+ supports PostgreSQL extensions natively. Without declaring the `vector` extension in `schema.prisma`, the migration SQL won't include `CREATE EXTENSION IF NOT EXISTS "vector"`, and the shadow database used by `prisma migrate dev` will fail because the `vector` type doesn't exist.

**Before (broken):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

**After (working):**
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [vector]
}
```

Both pieces are required:
- `previewFeatures = ["postgresqlExtensions"]` in the generator.
- `extensions = [vector]` in the datasource.

Without this, any model using `Unsupported("vector(1536)")` will fail at migration time.

### 3. No migrations existed — tables were never created

The schema was defined but `prisma migrate dev` had never been run. The app started, connected to the database, and immediately crashed with:

```
PrismaClientKnownRequestError: The table `public.User` does not exist in the current database.
```

The fix was to create and apply the initial migration.

---

## Supabase + `prisma migrate dev` drift problem

Supabase databases come with pre-installed extensions (pg_graphql, pg_stat_statements, pgcrypto, supabase_vault, uuid-ossp). Prisma's shadow database doesn't have these, so `prisma migrate dev` detects "drift" and demands a reset.

**Workaround:** Use `prisma migrate diff` + `prisma migrate deploy` instead of `prisma migrate dev` when working with Supabase:

```bash
# Generate migration SQL without shadow database:
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script \
  --config prisma/prisma.config.ts \
  > prisma/migrations/<timestamp>_<name>/migration.sql

# Apply it directly (no shadow DB):
npx prisma migrate deploy --config prisma/prisma.config.ts
```

Or, if starting fresh and you're OK resetting:

```bash
npx prisma migrate reset --config prisma/prisma.config.ts --force
```

---

## Running Prisma commands

All Prisma commands must be run from `apps/api/` and must pass `--config`:

```bash
cd apps/api

# Generate client
npx prisma generate --config prisma/prisma.config.ts

# Create + apply migrations (may fail on Supabase due to drift — see above)
npx prisma migrate dev --name <migration_name> --config prisma/prisma.config.ts

# Apply migrations without shadow DB check (use this for Supabase)
npx prisma migrate deploy --config prisma/prisma.config.ts

# Open Prisma Studio
npx prisma studio --config prisma/prisma.config.ts
```

---

## Environment

The `.env` file lives at the **workspace root** (`/mindlm/.env`), not inside `apps/api/`. The `prisma.config.ts` loads it manually:

```ts
import { config } from 'dotenv';
config({ path: path.join(__dirname, '../../../.env') });
```

Required variable: `DATABASE_URL` — a Supabase PostgreSQL connection string.

---

## PrismaService (NestJS runtime)

The `PrismaService` at `src/prisma/prisma.service.ts` uses the `@prisma/adapter-pg` driver adapter with a native `pg.Pool`:

```ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
super({ adapter });
```

This is the correct pattern for Prisma 7.7+ with driver adapters. The `driverAdapters` preview feature flag is **not needed** in Prisma 7 — it's GA.

---

## Supabase prerequisite

Before running the first migration, enable pgvector in the Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The migration SQL also runs this, but Supabase may require it to be enabled at the project level first.

---

## File reference

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | Data model, extensions, generator config |
| `apps/api/prisma/prisma.config.ts` | Prisma CLI config (datasource URL, paths) |
| `apps/api/prisma/migrations/` | Migration history |
| `apps/api/src/prisma/prisma.service.ts` | NestJS injectable PrismaClient with PrismaPg adapter |
| `apps/api/src/prisma/prisma.module.ts` | Global NestJS module exporting PrismaService |
| `.env` (workspace root) | DATABASE_URL |
