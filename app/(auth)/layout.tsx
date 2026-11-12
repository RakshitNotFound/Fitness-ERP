import type { ReactNode } from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

/**
 * Fitness ERP — auth shell for /login and /signup.
 *
 * Premium treatment: a full-bleed gym-equipment photograph from Unsplash sits
 * behind everything, then a heavy `zinc-950/80` overlay is stacked on top of it
 * so the white type and the dark glass card always have contrast, no matter how
 * bright the photo is. A radial vignette closes the frame at the edges.
 *
 * The photo is applied as a CSS background (not next/image) on purpose: Unsplash
 * stays a "direct URL" dependency with zero build-time configuration, and the
 * fixed attachment gives a subtle parallax on desktop.
 */

/** High-resolution gym photograph (Unsplash CDN — no API key required). */
const GYM_PHOTO_URL =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-zinc-950">
      {/* ---------- 1. Gym equipment photography (base layer) ---------- */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-zinc-950 bg-cover bg-center bg-no-repeat md:bg-fixed"
        style={{ backgroundImage: `url("${GYM_PHOTO_URL}")` }}
      />

      {/* ---------- 2. Heavy dark overlay (80% zinc-950) ---------- */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-zinc-950/80" />

      {/* ---------- 3. Vignette so the card edge glows against the photo ---------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_50%_-10%,rgba(9,9,11,0.15)_0%,rgba(9,9,11,0.7)_55%,rgba(9,9,11,0.96)_100%)]"
      />
      <div
        aria-hidden
        className="hairline-fade pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
      />

      {/* ---------- 4. Content ---------- */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-14 sm:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex animate-fade-in items-center gap-3 transition-premium hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
        >
          <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur">
            <Dumbbell className="size-5 text-zinc-100" aria-hidden />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-base font-semibold tracking-[-0.02em] text-white">
              Fitness ERP
            </span>
            <span className="mt-1.5 text-[9px] uppercase tracking-premium text-zinc-500">
              Gym Operating System
            </span>
          </span>
        </Link>

        {children}
      </main>

      {/* ---------- 5. Footer micro-copy ---------- */}
      <footer className="relative z-10 flex items-center justify-center gap-3 px-6 pb-8 text-[10px] uppercase tracking-premium text-zinc-500">
        <span>&copy; {new Date().getFullYear()} Fitness ERP</span>
        <span aria-hidden className="h-3 w-px bg-zinc-800" />
        <span>Built for gym owners</span>
      </footer>
    </div>
  );
}
