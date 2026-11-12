/**
 * Post-authentication redirect helpers.
 *
 * A `next` value travels through URLs (`/login?next=...`,
 * `/auth/callback?next=...`), which makes it attacker-controlled input. Only
 * same-origin, absolute *paths* are ever honoured — anything that could be
 * parsed as a host (`//evil.com`, `https://evil.com`, `/\evil.com`) silently
 * falls back to the dashboard. This is what keeps us free of open-redirect
 * abuse via crafted confirmation links.
 */

/** Where a signed-in user lands when no valid `next` was supplied. */
export const DEFAULT_POST_AUTH_PATH = "/dashboard";

/**
 * Returns a safe, internal path for post-login navigation.
 *
 * @param candidate Raw `next` value from the URL (may be null/undefined).
 * @param fallback  Path to use when `candidate` is missing or unsafe.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_POST_AUTH_PATH,
): string {
  if (!candidate) {
    return fallback;
  }

  const path = candidate.trim();

  // Must start with exactly one "/" — rejects "//host" and full URLs.
  if (!path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  // Reject backslashes and whitespace that browsers may normalise into a
  // protocol-relative URL (e.g. "/\evil.com" -> "//evil.com").
  if (/[\\\s]/.test(path)) {
    return fallback;
  }

  return path;
}
