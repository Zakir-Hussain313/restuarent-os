import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection string."
  );
}

export default defineConfig({
  // Step 2 will populate src/db/schema/ with one file per domain.
  schema: "./src/db/schema/*.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Supabase's pooled connection (pgbouncer, port 6543) doesn't support
  // prepared statements, which drizzle-kit needs for introspection/migration.
  // We use the direct connection (port 5432) for DATABASE_URL specifically
  // for this reason — see .env.example.
  verbose: true,
  strict: true,
});