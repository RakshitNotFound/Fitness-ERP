"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, CreditCard, Dumbbell, LayoutDashboard, Users } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fitness ERP — dashboard navigation.
 *
 * Client Component because the active state depends on `usePathname()`. The nav
 * model lives here (not in a prop) so the desktop sidebar and the mobile Sheet
 * share one source of truth without shipping icon components across the
 * server/client boundary.
 *
 * Active treatment: a solid white pill with black text — the loudest contrast
 * the monochrome palette allows — eased in by `transition-premium`.
 */

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/plans", label: "Plans", icon: Dumbbell },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/classes", label: "Classes", icon: Calendar },
];

/** `/members/123` still highlights `/members`. */
function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  onNavigate,
  className,
}: {
  /** Called after a link is clicked — used by the mobile Sheet to close itself. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Workspace" className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium outline-none transition-premium focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
              isActive
                ? "border-white bg-white text-zinc-950 shadow-[0_12px_32px_-20px_rgba(255,255,255,0.65)]"
                : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0",
                isActive ? "text-zinc-950" : "text-zinc-500 group-hover:text-white",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full transition-premium",
                isActive ? "bg-zinc-950 opacity-100" : "bg-white opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
