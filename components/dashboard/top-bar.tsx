import { LogoutButton } from "@/components/auth/logout-button";
import { MobileNav } from "@/components/dashboard/mobile-nav";

/**
 * Minimalist dark top bar.
 *
 * Holds the three things every dashboard screen needs: the mobile drawer
 * trigger (hidden at `md` and up), the signed-in email, and the logout button.
 * Sticks to the top with a translucent zinc-950 blur so content scrolls under
 * a hairline border rather than cutting off mid-element.
 */
export function TopBar({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950/85 px-4 backdrop-blur-xl sm:px-6">
      <MobileNav email={email} />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden text-[10px] uppercase tracking-premium text-zinc-600 sm:inline">
          Signed in as
        </span>
        <p className="min-w-0 truncate text-xs font-medium text-zinc-300" title={email}>
          {email}
        </p>
      </div>

      <LogoutButton className="h-8 shrink-0 gap-1.5 border-zinc-800 bg-zinc-900/60 px-3 text-xs" />
    </header>
  );
}
