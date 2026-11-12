/**
 * Fitness ERP — trial / subscription helpers.
 *
 * The billing model lives in `public.gyms`:
 *   - `is_paid = false` -> access lasts until `trial_ends_at` (3 days from sign-up).
 *   - `is_paid = true`  -> access lasts until the end of `paid_until` (a `date`).
 *
 * `middleware.ts` uses the same rules to gate requests; this module holds the
 * shared, side-effect-free maths so server components (e.g. the dashboard
 * banner) can reason about the window without duplicating the logic.
 */

/**
 * Columns every billing check needs from `gyms`. Exported so callers select
 * exactly these and the shape stays in sync with the type below.
 */
export const GYM_BILLING_COLUMNS = "is_paid, trial_ends_at, paid_until" as const;

/** The slice of a `gyms` row the billing helpers read. */
export type GymBillingRow = {
  is_paid: boolean | null;
  trial_ends_at: string | null;
  paid_until: string | null;
};

/** How close to the end of the window the warning banner starts showing (24h). */
export const BILLING_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;

/**
 * Instant the gym's current access window closes, in epoch milliseconds.
 *
 * - Paid gyms: `paid_until` is a `date`, so the whole UTC day is still covered.
 * - Trial gyms: `trial_ends_at` is an exact `timestamptz`.
 * - Returns `null` when the window is open-ended (`is_paid` with no
 *   `paid_until`) or the timestamp is missing / unparseable — in both cases we
 *   stay optimistic and never show (or enforce) an expiry.
 */
export function getAccessEndsAt(gym: GymBillingRow): number | null {
  if (gym.is_paid) {
    if (!gym.paid_until) {
      return null;
    }

    const paidUntilMs = Date.parse(`${gym.paid_until}T23:59:59.999Z`);
    return Number.isFinite(paidUntilMs) ? paidUntilMs : null;
  }

  const trialEndsMs = gym.trial_ends_at ? Date.parse(gym.trial_ends_at) : Number.NaN;
  return Number.isFinite(trialEndsMs) ? trialEndsMs : null;
}

/** What the dashboard banner needs to know about an imminent expiry. */
export type BillingNotice = {
  /** True when the gym has already paid for the current window. */
  isPaid: boolean;
  /** Instant the window closes (epoch ms) — safe to render as `<time>`. */
  endsAtMs: number;
  /** Milliseconds left before the window closes (always > 0 here). */
  remainingMs: number;
};

/**
 * Returns a notice when access ends within the next 24 hours, otherwise `null`.
 *
 * `null` covers every "nothing to warn about" case: no gym row, an open-ended
 * paid plan, a window further than 24 hours away, or a window that has already
 * lapsed (middleware redirects those users to /trial-expired instead).
 */
export function getBillingNotice(
  gym: GymBillingRow | null | undefined,
  now: number = Date.now(),
): BillingNotice | null {
  if (!gym) {
    return null;
  }

  const endsAtMs = getAccessEndsAt(gym);

  if (endsAtMs === null) {
    return null;
  }

  const remainingMs = endsAtMs - now;

  if (remainingMs <= 0 || remainingMs > BILLING_WARNING_WINDOW_MS) {
    return null;
  }

  return { isPaid: Boolean(gym.is_paid), endsAtMs, remainingMs };
}

/**
 * Human countdown for the banner: "less than a minute", "42 minutes",
 * "1 hour 5 minutes", "23 hours". Deliberately coarse — the banner is a nudge,
 * not a stopwatch, and a stale minute never looks broken.
 */
export function formatTimeRemaining(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return "less than a minute";
  }

  if (remainingMs < MINUTE_MS) {
    return "less than a minute";
  }

  const totalMinutes = Math.floor(remainingMs / MINUTE_MS);

  if (totalMinutes < 60) {
    return pluralize(totalMinutes, "minute");
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    return pluralize(hours, "hour");
  }

  // Hide the minutes when they would read as noise ("3 hours 1 minute").
  return minutes === 0 || minutes > 55
    ? pluralize(hours, "hour")
    : `${pluralize(hours, "hour")} ${pluralize(minutes, "minute")}`;
}

/** `1 minute` / `2 minutes` — no value here ever needs an irregular plural. */
function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}
