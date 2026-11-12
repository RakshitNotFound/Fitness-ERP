import type { Metadata } from "next";
import { Lock, Mail } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";

/**
 * /trial-expired — billing gate screen.
 *
 * Shown by `middleware.ts` when a signed-in gym's 3-day trial has lapsed
 * (`is_paid = false` and `now() > trial_ends_at`) or its paid window has run out
 * (`is_paid = true` and `now() > paid_until`). The route is public so the user
 * is never bounced back to /login while their workspace is locked.
 *
 * A Server Component: the GPay UPI id and the contact address are read from the
 * environment on the server, so nothing has to be fetched in the browser.
 */

/**
 * GPay / UPI id members should pay to. Set `NEXT_PUBLIC_GPAY_NUMBER` in
 * `.env.local` (the variable name predates UPI ids — a UPI handle such as
 * `gym@okhdfcbank` works just as well as a phone number).
 */
const GPAY_NUMBER = (process.env.NEXT_PUBLIC_GPAY_NUMBER ?? "").trim();

/** Address members contact after paying (owner/admin inbox). */
const CONTACT_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim();

/** Shown until the env var is filled in, so a missing id is impossible to miss. */
const GPAY_FALLBACK = "[INSERT YOUR UPI ID HERE]";

export const metadata: Metadata = {
  title: "Trial ended — Fitness ERP",
  description: "Your Fitness ERP trial has ended. Pay via GPay to continue.",
  robots: { index: false, follow: false },
};

export default function TrialExpiredPage() {
  return (
    <div className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden bg-zinc-950 px-5 py-14 sm:px-8">
      {/* Soft radial glow so the card floats off the near-black page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_50%_-10%,rgba(255,255,255,0.10)_0%,rgba(9,9,11,0.75)_55%,rgba(9,9,11,0.98)_100%)]"
      />

      {/* ---------- Centered zinc-900 card ---------- */}
      <main className="w-full max-w-[27rem] animate-fade-up rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-white shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)] sm:p-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <Lock className="size-5 text-white" aria-hidden />
        </span>

        <p className="mt-6 text-[10px] font-medium uppercase tracking-premium text-zinc-500">
          Trial ended
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">
          Your 3-day trial has ended.
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          To continue, pay via GPay to{" "}
          <span className="select-all whitespace-nowrap rounded-sm bg-zinc-800 px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-white">
            {GPAY_NUMBER || GPAY_FALLBACK}
          </span>{" "}
          and contact us.
        </p>

        {/* ---------- Payment + contact details ---------- */}
        <dl className="mt-7 divide-y divide-zinc-800 border-y border-zinc-800 text-left text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-xs uppercase tracking-premium text-zinc-500">GPay / UPI</dt>
            <dd className="select-all font-mono text-sm font-medium text-white">
              {GPAY_NUMBER || GPAY_FALLBACK}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-xs uppercase tracking-premium text-zinc-500">Contact</dt>
            <dd className="font-medium text-white">
              {CONTACT_EMAIL ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-1.5 underline-offset-4 transition-premium hover:text-zinc-300 hover:underline"
                >
                  <Mail className="size-3.5 text-zinc-400" aria-hidden />
                  {CONTACT_EMAIL}
                </a>
              ) : (
                "Reply to our payment email"
              )}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">
          Send the payment screenshot along with your gym name. Your workspace unlocks as soon as
          we confirm it.
        </p>

        <LogoutButton className="mt-7 w-full" />

        <p className="mt-5 text-[10px] uppercase tracking-premium text-zinc-600">
          Fitness ERP — Gym Operating System
        </p>
      </main>
    </div>
  );
}

