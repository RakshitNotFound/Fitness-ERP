import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/auth/redirects";

/**
 * /login — sign in to an existing gym workspace.
 *
 * A Server Component so the `next` query parameter can be sanitised before it
 * ever reaches the browser, and so no `useSearchParams` Suspense boundary is
 * needed. The interactive part lives in `LoginForm`.
 */

export const metadata: Metadata = {
  title: "Sign in — Fitness ERP",
  description: "Sign in to your Fitness ERP gym workspace.",
};

type LoginPageProps = {
  searchParams?: { next?: string; error?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  // Only internal paths are honoured (blocks open redirects).
  const nextPath = safeRedirectPath(searchParams?.next);
  const errorMessage = searchParams?.error;

  return (
    <Card className="w-full max-w-[27rem] animate-fade-up rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-50 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
      <CardHeader className="space-y-2 p-7 pb-6">
        <p className="text-[10px] font-medium uppercase tracking-premium text-zinc-500">
          Owner access
        </p>
        <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-white">
          Welcome back
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-zinc-400">
          Sign in to run today&apos;s front desk, memberships and revenue.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-7 pt-0">
        {errorMessage ? (
          <div
            role="alert"
            className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <LoginForm nextPath={nextPath} />
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 border-t border-zinc-800/80 px-7 py-5 text-sm text-zinc-400">
        <p>
          New to Fitness ERP?{" "}
          <Link
            href="/signup"
            className="font-medium text-white underline-offset-4 hover:underline"
          >
            Create a gym account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
