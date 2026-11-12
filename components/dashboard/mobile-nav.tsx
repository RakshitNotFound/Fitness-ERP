"use client";

import { useState } from "react";
import { Dumbbell, Menu } from "lucide-react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Mobile navigation — the desktop sidebar collapsed into a left-hand Sheet
 * drawer (shadcn `sheet`, built on Radix Dialog).
 *
 * The drawer is controlled so it can close itself the moment a link is tapped;
 * nav links are wrapped in `SheetContent` rather than `SheetClose` to keep the
 * markup identical to the desktop sidebar.
 */
export function MobileNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 outline-none transition-premium hover:border-zinc-700 hover:bg-zinc-900 hover:text-white focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 md:hidden"
        >
          <Menu className="size-4" aria-hidden />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-[18rem] flex-col gap-0 border-r border-zinc-800 bg-zinc-950 p-0 text-zinc-50"
      >
        <SheetHeader className="space-y-0 border-b border-zinc-800 px-5 py-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.01em] text-white">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <Dumbbell className="size-4 text-zinc-100" aria-hidden />
            </span>
            Fitness ERP
          </SheetTitle>
          <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />

          <div className="mt-6 border-t border-zinc-800 px-2 pt-4">
            <p className="text-[10px] uppercase tracking-premium text-zinc-600">Signed in</p>
            <p className="mt-1.5 truncate text-xs text-zinc-400" title={email}>
              {email}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
