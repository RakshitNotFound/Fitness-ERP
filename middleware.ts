import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseCredentials, isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Fitness ERP — auth middleware.
 *
 * Runs on every non-static request and does two jobs:
 *   1. Refreshes the Supabase session (rotating refresh tokens) and writes the
 *      updated cookies back onto the response.
 *   2. Enforces the access model below.
 *
 * ACCESS MODEL (secure by default):
 *   - PUBLIC_ROUTES are reachable without a session.
 *   - Everything else requires a session — including `/dashboard` and `/admin`,
 *     plus any route added later.
 *   - BILLING GATE: a signed-in gym loses access to every protected route once
 *     its 3-day trial has lapsed (`is_paid = false` and `now > trial_ends_at`)
 *     or its paid window has run out (`is_paid = true` and `now > paid_until`).
 *     Those requests are redirected to `/trial-expired`.
 *   - `/admin` is exempt from the billing gate.
 *   - `/admin` is OWNER ONLY: a signed-in user whose email does not match
 *     `ADMIN_EMAIL` is redirected to `/dashboard`.
 *
 * When you add a new public page (e.g. an OAuth callback such as
 * `/api/auth/callback`, or `/reset-password`), add it to PUBLIC_ROUTES.
 */

/**
 * Routes reachable without a session.
 *
 * `/auth/callback` MUST stay public: it is where Supabase sends users from a
 * confirmation email, and it needs to read the `code` / `token_hash` before a
 * session exists. Guarding it would redirect the visitor to /login and throw
 * the one-time code away.
 */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/trial-expired",
] as const;

/** Where unauthenticated visitors are sent. */
const LOGIN_PATH = "/login";

/** Where authenticated users land (and are sent away from auth screens). */
const DASHBOARD_PATH = "/dashboard";

/** Auth screens that a signed-in user should not see. */
const AUTH_ROUTES = ["/login", "/signup"] as const;

/** Where expired gyms are parked until they pay. */
const TRIAL_EXPIRED_PATH = "/trial-expired";

/**
 * Routes that bypass the billing gate. `/admin` stays reachable so the owner
 * can still flip `is_paid` / `paid_until` on a lapsed gym.
 */
const BILLING_EXEMPT_ROUTES = ["/admin"] as const;

/**
 * Owner-only console. Anyone signed in with a different email is bounced to
 * their own dashboard, so a gym owner can never reach the platform admin view.
 */
const ADMIN_PATH = "/admin";

/** The columns the billing gate needs from the caller's `gyms` row. */
type GymBillingRow = {
  is_paid: boolean | null;
  trial_ends_at: string | null;
  paid_until: string | null;
};

/** Headers the Supabase client expects on responses that write auth cookies. */
const CACHE_HEADERS = ["cache-control", "pragma", "expires"] as const;

let hasWarnedAboutMissingEnv = false;

function matchesRoute(pathname: string, route: string): boolean {
  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => matchesRoute(pathname, route));
}

function isBillingExemptRoute(pathname: string): boolean {
  return BILLING_EXEMPT_ROUTES.some((route) => matchesRoute(pathname, route));
}

function isAdminRoute(pathname: string): boolean {
  return matchesRoute(pathname, ADMIN_PATH);
}

/**
 * True when the signed-in user's email matches `ADMIN_EMAIL`.
 *
 * Compared case-insensitively (email casing is not meaningful). When
 * `ADMIN_EMAIL` is unset nobody is an admin, so `/admin` stays closed rather
 * than accidentally falling open.
 */
function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    return false;
  }

  return email?.trim().toLowerCase() === adminEmail;
}

/**
 * True when the gym's trial or paid window has lapsed.
 *
 * - Never paid: access lasts until `trial_ends_at` (3 days from sign-up).
 * - Paid: `paid_until` is a `date`, so the whole of that day (UTC) is still
 *   covered; a missing `paid_until` is treated as an open-ended subscription.
 * - Unparseable / missing timestamps fail open — a bad row must not lock a gym.
 */
function isBillingLapsed(gym: GymBillingRow, now: number = Date.now()): boolean {
  if (gym.is_paid) {
    if (!gym.paid_until) {
      return false;
    }

    const paidUntilMs = Date.parse(`${gym.paid_until}T23:59:59.999Z`);
    return Number.isFinite(paidUntilMs) ? now > paidUntilMs : false;
  }

  const trialEndsMs = gym.trial_ends_at ? Date.parse(gym.trial_ends_at) : Number.NaN;
  return Number.isFinite(trialEndsMs) ? now > trialEndsMs : false;
}

/**
 * Builds a redirect that keeps any cookies and cache headers written by the
 * Supabase client — dropping them would lose a freshly rotated session.
 */
function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  nextPath?: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }

  const redirect = NextResponse.redirect(url);

  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

  CACHE_HEADERS.forEach((header) => {
    const value = response.headers.get(header);
    if (value) {
      redirect.headers.set(header, value);
    }
  });

  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // --- Not configured yet: keep public routes alive, block everything else. ---
  if (!isSupabaseConfigured()) {
    if (!hasWarnedAboutMissingEnv) {
      hasWarnedAboutMissingEnv = true;
      console.warn(
        "[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. " +
          "Public routes still render, but every protected route redirects to " +
          `${LOGIN_PATH} until you add them to .env.local and restart the server.`,
      );
    }

    return isPublicRoute(pathname)
      ? NextResponse.next()
      : redirectWithCookies(request, NextResponse.next(), LOGIN_PATH, `${pathname}${search}`);
  }

  const { url, anonKey } = getSupabaseCredentials();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Keep the request cookies in sync so downstream reads see the new
        // tokens, then mirror them onto the outgoing response.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );

        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Validates the JWT against Supabase Auth and refreshes the session if needed.
  // Must run before the response is returned so refreshed cookies are not lost.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed out and asking for a protected route -> login, remembering the target.
  if (!user && !isPublicRoute(pathname)) {
    return redirectWithCookies(request, response, LOGIN_PATH, `${pathname}${search}`);
  }

  // Signed in and sitting on an auth screen -> straight to the dashboard.
  if (user && isAuthRoute(pathname)) {
    return redirectWithCookies(request, response, DASHBOARD_PATH);
  }

  // --- Owner gate: `/admin` is reserved for `ADMIN_EMAIL`. Any other signed-in
  // user is sent to their own dashboard instead of the platform console.
  if (user && isAdminRoute(pathname) && !isAdminEmail(user.email)) {
    return redirectWithCookies(request, response, DASHBOARD_PATH);
  }

  // --- Billing gate: trial / subscription lapsed, but only for signed-in users
  // on protected, non-exempt routes (`/admin` stays open, public pages stay open).
  if (user && !isPublicRoute(pathname) && !isBillingExemptRoute(pathname)) {
    // RLS on `gyms` is `id = current_gym_id()`, so the caller's own row is the
    // only one this query can ever return — no explicit filter needed.
    const { data: gym, error } = await supabase
      .from("gyms")
      .select("is_paid, trial_ends_at, paid_until")
      .maybeSingle();

    if (error) {
      // Fail open: a Supabase hiccup must never lock a paying gym out.
      console.error("[middleware] billing check failed:", error.message);
    } else if (gym && isBillingLapsed(gym as GymBillingRow)) {
      return redirectWithCookies(request, response, TRIAL_EXPIRED_PATH);
    }
  }

  return response;
}

export const config = {
  /**
   * Run on every path except Next.js build assets and static files. Skipping
   * these keeps middleware off the hot path for images, fonts and CSS.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|css|js|map)$).*)",
  ],
};
