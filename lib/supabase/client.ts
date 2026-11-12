import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCredentials } from "@/lib/supabase/env";

/**
 * Browser-side Supabase client.
 *
 * Use this from Client Components ("use client") — for realtime subscriptions,
 * client-side auth state, and browser reads/writes that RLS protects.
 *
 * It authenticates with the PUBLIC anon key only. The service role key is never
 * available in the browser bundle, by design.
 *
 * `createBrowserClient` already memoises a single instance per browser tab, so
 * calling `createClient()` repeatedly is cheap and safe.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseCredentials();

  return createBrowserClient(url, anonKey);
}
