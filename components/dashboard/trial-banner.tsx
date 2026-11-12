import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

import { formatTimeRemaining, type BillingNotice } from "@/lib/billing/trial";
import { cn } from "@/lib/utils";

/**
 * Subtle expiry banner pinned above the dashboard content.
 *
 * Rendered by `app/(dashboard)/layout.tsx` only when the gym's trial (or paid
 * window) closes within 24 hours — the notice is computed on the server, so the
 * countdown is correct on first paint with no client JS.
 *
 * Styling stays inside the app's monochrome palette: a zinc-900 glass strip on
 * a zinc-950 page, a hairline rule, and a single white CTA. No alarm colours —
 * the urgency comes from the countdown, not from shouting.
 */
export function TrialBanner({
  notice,
  className,
}: {
  notice: BillingNotice;
  className?: string;
}) {
  const label = notice.isPaid ? "Subscription" : "Trial";
  const remaining = formatTimeRemaining(notice.remainingMs);
  const endsAtIso = new Date(notice.endsAtMs).toISOString();

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        "relative z-20 border-b border-zinc-800 bg-zinc-900/80 text-zinc-200 backdrop-blur-xl",
        className,
      )}
    >
      {/* Hairline highlight along the top edge, matching the rest of the shell. */}
      <div aria-hidden className="hairline-fade pointer-events-none absolute inset-x-0 top-0 h-px" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="relative mt-px flex size-7 shrink-0 items-center justify-center rounded-md border border-zinc-700/70 bg-zinc-950/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:mt-0">
            <Clock3 className="size-3.5 text-zinc-300" aria-hidden />
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-white"
            />
          </span>

          <p className="text-[13px] leading-relaxed">
            <span className="font-medium text-white">
              {label} ends in {remaining}.
            </span>{" "}
            <time dateTime={endsAtIso} className="sr-only">
              {new Date(notice.endsAtMs).toUTCString()}
            </time>
            <span className="hidden text-zinc-400 sm:inline">
              Pay via GPay to keep your workspace unlocked — nothing is deleted.
            </span>
          </p>
        </div>

        <Link
          href="/trial-expired"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-md bg-white px-3.5 text-xs font-medium text-zinc-950 transition-premium hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 sm:self-auto"
        >
          Pay now
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
