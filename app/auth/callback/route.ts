import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

/**
 * Fitness ERP — Supabase auth callback.
 *
 * Supabase sends users here from two kinds of email links:
 *
 *   1. PKCE links (the default for `signUp` / `signInWithOtp` in @supabase/ssr)
 *      carry a `?code=...` that must be exchanged for a session.
 *   2. Server-generated links (`{{ .TokenHash }}` templates) carry
 *      `?token_hash=...&type=signup` and are verified as an OTP.
 *
 * Both paths write the session cookies onto the response, so the user lands on
 * the dashboard already signed in. Every failure mode redirects back to /login
 * with a human-readable `?error=` message instead of a blank JSON body.
 *
 * NOTE: `/auth/callback` is listed in `middleware.ts` PUBLIC_ROUTES — a
 * signed-out visitor must be able to reach it, otherwise the code would be
 * discarded by the login redirect.
 */

/** Only ever revalidate this route, never statically render it. */
export const dynamic = "force-dynamic";

/** OTP types Supabase can put in the `type` query parameter. */
const OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

type OtpType = (typeof OTP_TYPES)[number];

function isOtpType(value: string | null): value is OtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/** Builds a redirect that keeps the session cookies written by the Supabase client. */
function redirectTo(request: NextRequest, pathname: string, error?: string) {
  const url = new URL(pathname, request.url);

  if (error) {
    url.searchParams.set("error", error);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Where the user wanted to go before being bounced to auth.
  const nextPath = safeRedirectPath(searchParams.get("next"));

  // Supabase reports failures (expired link, already-used token, ...) here.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    return redirectTo(
      request,
      "/login",
      "That confirmation link is invalid or has expired. Please sign in, or sign up again to get a fresh link.",
    );
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!code && !(tokenHash && isOtpType(type))) {
    return redirectTo(
      request,
      "/login",
      "This link is missing its verification code. Please sign in, or request a new email.",
    );
  }

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectTo(request, nextPath);
    }
  } else if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return redirectTo(request, nextPath);
    }
  }

  return redirectTo(
    request,
    "/login",
    "We could not confirm your email address. Please sign in, or request a new link.",
  );
}
