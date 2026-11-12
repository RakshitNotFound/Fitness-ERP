"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Logout button — calls the `signOut` server action, toasts the result, then
 * jumps to /login. Uses sonner so the feedback matches every other mutation in
 * the app, and disables itself while the server action is in flight.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const { error } = await signOut();

      if (error) {
        toast.error("Could not sign you out", { description: error });
        setIsSigningOut(false);
        return;
      }

      toast.success("Signed out", { description: "See you at the front desk." });

      router.replace("/login");
      router.refresh();
    } catch (cause) {
      toast.error("Could not sign you out", {
        description:
          cause instanceof Error
            ? cause.message
            : "Unexpected error. Please try again.",
      });
      setIsSigningOut(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={cn(
        "border-zinc-700 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800 hover:text-white",
        className,
      )}
    >
      {isSigningOut ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          Signing out…
        </>
      ) : (
        <>
          <LogOut aria-hidden />
          Sign out
        </>
      )}
    </Button>
  );
}
