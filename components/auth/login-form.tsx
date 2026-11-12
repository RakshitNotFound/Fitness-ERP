"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
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
 * Email + password sign-in.
 *
 * Runs entirely in the browser with the public anon key: `signInWithPassword`
 * returns a session that @supabase/ssr writes into auth cookies, so the next
 * navigation is already server-authenticated (middleware reads the same
 * cookies). Nothing privileged happens here.
 */

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Shared input skin for the dark glass card. */
const inputClassName =
  "h-11 border-zinc-800 bg-zinc-950/60 pl-10 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:ring-offset-0";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error("Could not sign you in", { description: error.message });
        return;
      }

      toast.success("Signed in", { description: "Opening your dashboard…" });

      // `nextPath` is sanitised server-side in the page component.
      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      toast.error("Sign in failed", {
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
                      fieldState.error && "border-red-500/60 focus-visible:ring-red-500/60",
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
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      inputClassName,
                      "pr-11",
                      fieldState.error && "border-red-500/60 focus-visible:ring-red-500/60",
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

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-11 w-full text-sm font-semibold tracking-[-0.01em]"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </Form>
  );
}
