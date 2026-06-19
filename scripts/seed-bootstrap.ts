/**
 * One-time bootstrap script — creates the first tenant and the first
 * SUPER_ADMIN staff account.
 *
 * This is NOT part of the app. It is never imported by Next.js code,
 * never reachable via a route, and uses the service role key directly —
 * it must only ever be run manually, from a trusted terminal.
 *
 * Run once:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-bootstrap.ts
 *
 * Safe to re-run: if a SUPER_ADMIN already exists, the script exits
 * without creating anything, so it cannot accidentally create duplicates.
 *
 * EDIT THE VALUES IN THE "CONFIGURE THIS" BLOCK BELOW BEFORE RUNNING.
 */

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

// ── CONFIGURE THIS ──────────────────────────────────────────────────────
const TENANT_NAME = "Zaiqa Restaurant"; // your restaurant's display name
const TENANT_SLUG = "zaiqa-restaurant"; // url-safe, unique
const ADMIN_EMAIL = "you@example.com";   // the email you'll log in with
const ADMIN_PASSWORD = "ChangeThisStrongPassword123!"; // change before running
const ADMIN_FIRST_NAME = "Your";
const ADMIN_LAST_NAME = "Name";
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const directDbUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  if (!directDbUrl) {
    throw new Error("Missing DATABASE_URL in .env.local");
  }

  // Service-role Supabase client — bypasses RLS, admin-only operations.
  // Never instantiate this pattern inside app code reachable by users.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Direct (non-pooled) connection — correct for one-off scripts/migrations.
  const client = postgres(directDbUrl, { prepare: false });
  const db = drizzle(client, { schema });

  // ── Guard: refuse to run if a SUPER_ADMIN already exists ───────────────
  const existingAdmin = await db.query.staff.findFirst({
    where: eq(schema.staff.role, "SUPER_ADMIN"),
  });

  if (existingAdmin) {
    console.log(
      `A SUPER_ADMIN already exists (${existingAdmin.email}). Nothing to do — exiting.`
    );
    await client.end();
    return;
  }

  // ── Step 1: create the tenant ───────────────────────────────────────────
  console.log("Creating tenant...");
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: TENANT_NAME,
      slug: TENANT_SLUG,
    })
    .returning();

  console.log(`Tenant created: ${tenant.id}`);

  // ── Step 2: create the auth.users row via admin API ─────────────────────
  console.log("Creating auth user...");
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // skip email verification for the bootstrap admin
      app_metadata: { role: "SUPER_ADMIN" },
    });

  if (authError || !authData.user) {
    // Roll back the tenant we just created — don't leave an orphaned tenant
    // with no admin behind if user creation fails.
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  console.log(`Auth user created: ${authData.user.id}`);

  // ── Step 3: create the matching staff row ───────────────────────────────
  console.log("Creating staff row...");
  try {
    await db.insert(schema.staff).values({
      id: authData.user.id, // MUST match auth.users.id exactly — see staff.ts comment
      tenantId: tenant.id,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      status: "active",
    });
  } catch (err) {
    // Roll back both the auth user and the tenant if the staff insert fails —
    // otherwise you'd have an auth user who can log in but has no staff row,
    // exactly the orphaned-account problem this script exists to avoid.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
    throw new Error(`Failed to create staff row: ${(err as Error).message}`);
  }

  console.log("\nBootstrap complete.");
  console.log(`  Tenant:  ${TENANT_NAME} (${tenant.id})`);
  console.log(`  Admin:   ${ADMIN_EMAIL}`);
  console.log(`  Role:    SUPER_ADMIN`);
  console.log("\nYou can now log in at /auth/login with this email/password.");
  console.log("Change the password after first login if you used a placeholder.");

  await client.end();
}

main().catch((err) => {
  console.error("\nBootstrap failed:", err.message);
  process.exit(1);
});