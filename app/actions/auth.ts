"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Fitness ERP — authentication server actions.
 *
 * Server actions are the only safe way to mutate the session from the UI: the
 * Supabase client here runs on the server, so `signOut()` can clear the auth
 * cookies through the Next.js cookie store. The browser only ever receives the
 * resulting Set-Cookie headers — never a refresh token in JavaScript.
 */

/** `error === null` means the user is signed out and cookies were cleared. */
export type SignOutResult = { error: string | null };

/**
 * Signs the current user out and invalidates cached signed-in UI.
 *
 * Deliberately does NOT redirect: the caller decides what happens next (toast
 * + `router.replace("/login")` in `LogoutButton`), which keeps this action
 * reusable from forms, buttons and future API routes.
 */
export async function signOut(): Promise<SignOutResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    // Purge every cached RSC payload so no signed-in markup survives the
    // cookie being removed (otherwise the router could replay a stale tree).
    revalidatePath("/", "layout");

    return { error: null };
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Could not sign you out. Please try again.",
    };
  }
}
