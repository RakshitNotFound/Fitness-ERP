import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

/**
 * Shared "Coming soon" panel for dashboard modules that are not built yet.
 *
 * Keeps every placeholder route visually identical: dark glass card on a
 * zinc-950 page, hairline borders, an icon chip, a quiet `Coming soon` pill and
 * a short list of what the module will do. No images, no colour — the same
 * monochrome language as the marketing page and the auth screens.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  features,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** What this module will eventually do — two short lines read best. */
  features: readonly string[];
}) {
  return (
    <main className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-5 py-12 sm:px-8 sm:py-16">
      <div aria-hidden className="gradient-hero pointer-events-none absolute inset-0" />
      <div aria-hidden className="grid-overlay pointer-events-none absolute inset-0" />

      <section className="relative z-10 w-full max-w-2xl animate-fade-up">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-7 shadow-[0_40px_120px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-10">
          <span className="flex size-11 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <Icon className="size-5 text-white" aria-hidden />
          </span>

          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-[10px] font-medium uppercase tracking-premium text-zinc-400">
            <Clock3 className="size-3" aria-hidden />
            Coming soon
          </p>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">
            {title}
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">{description}</p>

          <ul className="mt-8 grid gap-2.5 border-t border-zinc-800 pt-6 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-400">
                <span aria-hidden className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-zinc-600" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-5">
            <span className="text-[10px] uppercase tracking-premium text-zinc-600">
              In development
            </span>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-zinc-300 outline-none transition-premium hover:text-white focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              Back to dashboard
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
