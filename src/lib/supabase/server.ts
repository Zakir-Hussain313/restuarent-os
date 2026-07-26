import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Per-request server client — must be instantiated fresh on every call
// because Next.js cookies() is request-scoped.
// Use this in Server Components, Server Actions, and Route Handlers.
// Operates as the authenticated user and respects RLS.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            
          }
        },
      },
    }
  );
}