/**
 * One-time script: creates N fake STAFF accounts directly (bypasses the
 * email-invite flow — sets password immediately, no email sent) for load
 * testing concurrent logins. NOT for production use.
 *
 * Setup:
 *   npm i -D dotenv @supabase/supabase-js postgres
 *
 * Run:
 *   node seed-load-test-staff.mjs
 *
 * Reads DATABASE_POOL_URL, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SERVICE_ROLE_KEY from .env.local — same credentials the app
 * already uses. Prints a list of email/password pairs at the end; save
 * that output, load-test-pos-multi.mjs will need it.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const COUNT = parseInt(process.env.SEED_COUNT || "30", 10);
const PASSWORD = "LoadTest123!";
const EMAIL_DOMAIN = "loadtest.ricenspice.internal";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sql = postgres(process.env.DATABASE_POOL_URL, { prepare: false });

async function main() {
  // Pull tenantId + a real branchId from an existing staff row — reuses
  // whatever tenant/branch your real SUPER_ADMIN already belongs to.
  const [seed] = await sql`
    SELECT tenant_id, branch_id FROM staff
    WHERE branch_id IS NOT NULL
    LIMIT 1
  `;

  if (!seed) {
    console.error("No staff row with a branchId found — can't determine tenant/branch.");
    process.exit(1);
  }

  const { tenant_id: tenantId, branch_id: branchId } = seed;
  console.log(`Using tenantId=${tenantId} branchId=${branchId}`);

  const created = [];

  for (let i = 1; i <= COUNT; i++) {
    const email = `loadtest${i}@${EMAIL_DOMAIN}`;

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some((u) => u.email === email);
    if (alreadyExists) {
      console.log(`Skipping ${email} — already exists`);
      created.push(email);
      continue;
    }

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true, // skip verification entirely
      app_metadata: { role: "STAFF" },
    });

    if (createError || !userData.user) {
      console.error(`Failed to create ${email}:`, createError?.message);
      continue;
    }

    await sql`
      INSERT INTO staff (id, tenant_id, branch_id, first_name, last_name, email, role, status)
      VALUES (${userData.user.id}, ${tenantId}, ${branchId}, 'LoadTest', ${String(i)}, ${email}, 'STAFF', 'active')
      ON CONFLICT (id) DO NOTHING
    `;

    created.push(email);
    console.log(`Created ${email}`);
  }

  console.log(`\nDone. ${created.length} accounts ready.`);
  console.log(`Password for all: ${PASSWORD}`);
  console.log(`Emails: loadtest1..${COUNT}@${EMAIL_DOMAIN}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});