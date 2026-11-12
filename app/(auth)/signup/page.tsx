"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Eye, EyeOff, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MIN_PASSWORD_LENGTH = 8;

const inputClasses =
  "border-white/10 bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0";

export default function SignUpPage() {
  const router = useRouter();

  /**
   * Standard browser Supabase client (single instance per mount).
   */
  const supabase = React.useMemo(() => createClient(), []);

  const [fullName, setFullName] = React.useState("");
  const [gymName, setGymName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();
    const trimmedGymName = gymName.trim();

    if (!trimmedFullName) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          // THIS IS THE FIX: It points the email link to your live Vercel URL
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: trimmedFullName,
            gym_name: trimmedGymName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        setError(
          "An account with this email already exists. Try signing in instead.",
        );
        return;
      }

      if (data.session) {
        // Email confirmation disabled → user is signed in immediately.
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      // Email confirmation enabled → no session yet.
      setSuccess(
        `Almost there! We sent a confirmation link to ${trimmedEmail}. Open it to activate your workspace.`,
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Failed to fetch: your browser could not reach Supabase. Check your connection and that NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly.",
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      {/* Ambient glow + subtle grid, purely decorative */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-56 -right-24 h-[30rem] w-[30rem] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.045)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      <Card className="relative w-full max-w-md border-white/10 bg-zinc-900/60 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/70 text-emerald-400 shadow-inner backdrop-blur">
            <Dumbbell className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight text-white">
              Create your gym workspace
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              Manage members, billing and check-ins from one dashboard.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-zinc-300">
                  Full name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Alex Carter"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isPending}
                  required
                  className={inputClasses}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gymName" className="text-zinc-300">
                  Gym name
                </Label>
                <Input
                  id="gymName"
                  name="gymName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Iron Temple"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  disabled={isPending}
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">
                Work email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="owner@irontemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                required
                className={inputClasses}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className={`${inputClasses} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isPending}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:pointer-events-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className={inputClasses}
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300 backdrop-blur"
              >
                {error}
              </div>
            ) : null}

            {success ? (
              <div
                role="status"
                className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300 backdrop-blur"
              >
                {success}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-500 font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 disabled:bg-emerald-500/60"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating workspace…
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-center text-xs leading-relaxed text-zinc-500">
              By creating an account you agree to our{" "}
              <a
                href="/terms"
                className="text-zinc-300 underline-offset-4 hover:text-emerald-400 hover:underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="text-zinc-300 underline-offset-4 hover:text-emerald-400 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-white/5 pt-6">
          <p className="text-sm text-zinc-400">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium text-emerald-400 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
            >
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}