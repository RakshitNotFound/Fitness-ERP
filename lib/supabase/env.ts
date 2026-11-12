/**
 * Supabase environment helpers.
 *
 * Only the two PUBLIC values are read here, so this module is safe to import
 * from the browser bundle (Next.js inlines `NEXT_PUBLIC_*` at build time).
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is intentionally NOT referenced in this file — or
 * anywhere else that can be reached from client code. It must only ever be read
 * inside server-only modules (route handlers, server actions, server utilities)
 * and must never be sent to the browser.
 */

/** Public Supabase project URL. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Public Supabase anon key. Safe for the browser — Row Level Security applies. */
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True once the public Supabase credentials have been provided. */
export function isSupabaseConfigured(): boolean {
  return supabaseUrl.trim().length > 0 && supabaseAnonKey.trim().length > 0;
}

/**
 * Returns the public credentials, or throws a helpful error when they are
 * missing so the failure is obvious instead of a silent "undefined" request.
 */
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy `.env.local.example` to `.env.local`, paste your Supabase project keys, " +
        "then restart the dev server.",
    );
  }

  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}
