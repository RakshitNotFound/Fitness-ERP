import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {Calendar, CreditCard, Dumbbell, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";


import { createClient } from "@/lib/supabase/server";

/**
 * /dashboard — the workspace home screen.
 *
 * The shell (sidebar, top bar, trial banner) comes from
 * `app/(dashboard)/layout.tsx`; this page renders the content column only:
 *
 *   1. A "Welcome back" header — eyebrow, headline, signed-in email.
 *   2. Four KPI tiles, intentionally empty until the data modules land.
 *   3. Quiet cards linking into every module, a second path next to the nav.
 *
 * Everything is server-rendered; middleware.ts already blocks unauthenticated
 * requests, but the `redirect` below is deliberate defence-in-depth.
 */

export const metadata: Metadata = {
  title: "Dashboard — Fitness ERP",
  description: "Your Fitness ERP gym workspace.",
};

// Session-dependent: never prerender this at build time.
export const dynamic = "force-dynamic";

/** Placeholder KPIs — wired to real data once the modules exist. */
const METRICS = [
  { label: "Active members", value: "—", hint: "Members module" },
  { label: "Collected this month", value: "—", hint: "Payments module" },
  { label: "Classes this week", value: "—", hint: "Classes module" },
  { label: "Renewals due", value: "—", hint: "Plans module" },
] as const;

/** Second entry point into each module, matching the sidebar order. */
const MODULES = [
  {
    href: "/members",
    label: "Members",
    description: "Directory, status and history.",
    icon: Users,
  },
  {
    href: "/plans",
    label: "Plans",
    description: "Pricing, duration and limits.",
    icon: Dumbbell,
  },
  {
    href: "/payments",
    label: "Payments",
    description: "Fees collected and dues.",
    icon: CreditCard,
  },
  {
    href: "/classes",
    label: "Classes",
    description: "Timetable, trainers, attendance.",
    icon: Calendar,
  },
] as const;

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // `flex-1` (not `min-h-dvh`): the dashboard layout may render the expiry
  // banner above this page, and the content should fill the space left over.
  return (
    <main className="relative flex flex-1 w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-20">
      <div aria-hidden className="gradient-hero pointer-events-none absolute inset-0" />
      <div aria-hidden className="hairline-fade pointer-events-none absolute inset-x-0 top-0 h-px" />

      <section className="relative z-10 w-full max-w-xl animate-fade-up">
        <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50 shadow-[0_32px_100px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <CardHeader className="space-y-2 p-7 pb-6">
            <p className="text-[10px] font-medium uppercase tracking-premium text-zinc-500">
              Authenticated
            </p>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-white">
              Welcome to Dashboard
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              Signed in as{" "}
              <span className="font-medium text-zinc-200">{user.email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-7 pt-0">
            <Separator className="bg-zinc-800" />
            <p className="text-sm leading-relaxed text-zinc-400">
              Step 4 checkpoint — Supabase auth, session cookies, the email
              confirmation callback and logout are all wired up. Members,
              payments and classes land here next.
            </p>
          </CardContent>

          <CardFooter className="justify-between gap-3 border-t border-zinc-800/80 px-7 py-5">
            <span className="text-[10px] uppercase tracking-premium text-zinc-600">
              3-day trial
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </form>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
