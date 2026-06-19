import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS entirely.
// ONLY use in trusted server-side contexts:
//   - Tenant provisioning
//   - Staff invitation flows
//   - Writing audit logs
//   - Any action that intentionally needs to cross tenant boundaries
//
// NEVER import this in Client Components or expose it to the browser.
// The service role key grants unrestricted database access.

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      // Disable auto session refresh — this client authenticates via the
      // service role key, not a user session.
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);