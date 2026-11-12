import type { Metadata } from "next";
import { redirect } from "next/navigation";

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

export const metadata: Metadata = {
  title: "Dashboard — Fitness ERP",
  description: "Your Fitness ERP gym workspace.",
};

// Session-dependent: never prerender this at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

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
              Your workspace is ready. Use the sidebar to manage members, plans, payments, and classes.
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