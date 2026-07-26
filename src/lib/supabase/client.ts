import { createBrowserClient } from "@supabase/ssr";

// Singleton browser client — one instance for the entire browser session.
// Use this in Client Components only ("use client").
// Automatically reads/writes the session from cookies.
let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  return client;
}