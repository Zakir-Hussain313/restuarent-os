import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

// Runtime queries use the POOLED connection (pgbouncer, port 6543) —
// correct for serverless/edge: avoids exhausting direct Postgres
// connections under concurrent request load. Migrations use
// DATABASE_URL (direct, port 5432) instead, via drizzle.config.ts —
// never this file.
const connectionString = process.env.DATABASE_POOL_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_POOL_URL is not set. Check .env.local."
  );
}

// `prepare: false` is required when using Supabase's transaction-mode
// pooler (pgbouncer=true) — prepared statements aren't supported across
// pooled connections in transaction mode.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, {
  schema: { ...schema, ...relations },
});

