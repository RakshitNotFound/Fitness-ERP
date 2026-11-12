import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { getBillingNotice, GYM_BILLING_COLUMNS, type GymBillingRow } from "@/lib/billing/trial";
import { createClient } from "@/lib/supabase/server";

/**
 * Fitness ERP — authenticated dashboard shell.
 *
 * Every route inside `app/(dashboard)` renders through this layout, so it is the
 * single place that:
 *   1. Confirms there is a session (defence-in-depth — `middleware.ts` already
 *      blocks anonymous traffic before this ever runs).
 *   2. Reads the caller's `gyms` row on the server and shows a subtle banner
 *      when the trial / paid window closes within 24 hours.
 *   3. Renders the premium app chrome: pitch-black sidebar (a `Sheet` drawer
 *      below `md`), a minimalist top bar with the signed-in email and logout,
 *      then the page itself.
 *
 * Actual access *enforcement* (redirecting lapsed gyms to /trial-expired) lives
 * in `middleware.ts`; this layout only nudges people who are about to lose
 * access. RLS on `gyms` is `id = current_gym_id()`, so this query can only ever
 * return the caller's own row.
 */

// Session + billing dependent: never prerender this at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: gym, error } = await supabase
    .from("gyms")
    .select(GYM_BILLING_COLUMNS)
    .maybeSingle();

  // Fail open: a Supabase hiccup should hide the banner, never break the page.
  if (error) {
    console.error("[dashboard-layout] could not load gym billing:", error.message);
  }

  const notice = getBillingNotice((gym as GymBillingRow | null) ?? null);
  const email = user.email ?? "your account";

  return (
    <div className="flex min-h-dvh w-full bg-zinc-950">
      {/* Desktop sidebar — collapses into the MobileNav Sheet below `md`. */}
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {notice ? <TrialBanner notice={notice} /> : null}
        <TopBar email={email} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
