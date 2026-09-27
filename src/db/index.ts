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

// Cached on globalThis in dev so Turbopack/webpack hot-reloads reuse the
// same client instead of creating a fresh 30-connection pool on every file
// edit — without this, the pool never closes its old connections and
// eventually exhausts Supabase's pooler connection limit mid-session.
const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

// `prepare: false` is required when using Supabase's transaction-mode
// pooler (pgbouncer=true) — prepared statements aren't supported across
// pooled connections in transaction mode.
const client =
  globalForDb.postgresClient ?? postgres(connectionString, { prepare: false, max: 30 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, {
  schema: { ...schema, ...relations },
});
