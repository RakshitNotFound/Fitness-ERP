"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dumbbell, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/**
 * Gym owner sign-up.
 *
 * `options.data.gym_name` is read by the `handle_new_user()` trigger
 * (supabase/migrations/001_init.sql): it creates the gym row with a 3-day trial
 * plus the owner profile, so the user lands on a provisioned workspace.
 *
 * Flow depends on the Supabase "Confirm email" setting:
 *   - disabled -> a session comes back immediately, go straight to /dashboard.
 *   - enabled  -> show a "check your inbox" toast; the emailed link hits
 *                 /auth/callback, which exchanges the code and signs them in.
 */

const signupSchema = z
  .object({
    gymName: z
      .string()
      .trim()
      .min(2, "Enter your gym name")
      .max(80, "Keep it under 80 characters"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

/** Shared input skin for the dark glass card. */
const inputClassName =
  "h-11 border-zinc-800 bg-zinc-950/60 pl-10 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:ring-offset-0";

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      gymName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { gym_name: values.gymName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        toast.error("Could not create your account", {
          description: error.message,
        });
        return;
      }

      // Email confirmation disabled: the session is already live.
      if (data.session) {
        toast.success("Gym account created", {
          description: "Your 3-day trial has started.",
        });
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      toast.success("Check your inbox", {
        description: `We sent a confirmation link to ${values.email}.`,
      });
      router.replace("/login");
    } catch (cause) {
      toast.error("Sign up failed", {
        description:
          cause instanceof Error
            ? cause.message
            : "Unexpected error. Please try again.",
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="gymName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                Gym name
              </FormLabel>
              <div className="relative">
                <Dumbbell
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                />
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    autoComplete="organization"
                    placeholder="Iron Paradise"
                    className={cn(
                      inputClassName,
                      fieldState.error &&
                        "border-red-500/60 focus-visible:ring-red-500/60",
                    )}
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                Email
              </FormLabel>
              <div className="relative">
                <Mail
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                />
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="owner@yourgym.com"
                    className={cn(
                      inputClassName,
                      fieldState.error &&
                        "border-red-500/60 focus-visible:ring-red-500/60",
                    )}
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                Password
              </FormLabel>
              <div className="relative">
                <Lock
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                />
                <FormControl>
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className={cn(
                      inputClassName,
                      "pr-11",
                      fieldState.error &&
                        "border-red-500/60 focus-visible:ring-red-500/60",
                    )}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                Confirm password
              </FormLabel>
              <div className="relative">
                <Lock
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                />
                <FormControl>
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className={cn(
                      inputClassName,
                      fieldState.error &&
                        "border-red-500/60 focus-visible:ring-red-500/60",
                    )}
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-11 w-full text-sm font-semibold tracking-[-0.01em]"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Creating account…
            </>
          ) : (
            "Create gym account"
          )}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-zinc-500">
          You get a 3-day free trial. No card required.
        </p>
      </form>
    </Form>
  );
}
