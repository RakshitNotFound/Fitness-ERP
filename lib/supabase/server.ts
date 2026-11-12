import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseCredentials } from "@/lib/supabase/env";

/**
 * Server-side Supabase client.
 *
 * Use this from Server Components, Route Handlers and Server Actions. The
 * session is read from — and written back to — the Next.js cookie store, which
 * is what makes SSR auth work.
 *
 * IMPORTANT: create a new client for every request/render. Never hoist the
 * result into a module-level variable, or sessions will leak between users.
 *
 * This client uses the PUBLIC anon key and is subject to Row Level Security.
 * The service role key is deliberately not used here.
 */
export function createClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseCredentials();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // `headers` (cache-control etc.) is handled by middleware.ts — a Server
        // Component render cannot write response headers, only cookies.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: middleware.ts refreshes the session and writes
          // the updated cookies to the response.
        }
      },
    },
  });
}
