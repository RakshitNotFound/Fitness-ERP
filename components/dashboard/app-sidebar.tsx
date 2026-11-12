import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";

/**
 * Desktop sidebar — pitch black (zinc-950) panel with a single hairline rule on
 * the right and the white-on-black active nav state.
 *
 * Server Component: the only interactive part is `SidebarNav`, which is a
 * Client Component. Hidden below `md`, where `MobileNav` renders instead.
 */
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[16.5rem] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      {/* ---------- Brand ---------- */}
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-800 px-4">
        <Link
          href="/dashboard"
          className="group inline-flex min-w-0 items-center gap-2.5 rounded-md outline-none transition-premium hover:opacity-80 focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <Dumbbell className="size-4 text-zinc-100" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
              Fitness ERP
            </span>
            <span className="mt-1 truncate text-[9px] uppercase tracking-premium text-zinc-500">
              Gym Operating System
            </span>
          </span>
        </Link>
      </div>

      {/* ---------- Nav ---------- */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] uppercase tracking-premium text-zinc-600">Workspace</p>
        <SidebarNav />
      </div>

      {/* ---------- Footer ---------- */}
      <div className="shrink-0 border-t border-zinc-800 px-4 py-4">
        <p className="text-[10px] uppercase tracking-premium text-zinc-600">
          &copy; {new Date().getFullYear()} Fitness ERP
        </p>
      </div>
    </aside>
  );
}
