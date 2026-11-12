import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-24 text-center">
      {/* ---------- Ambient monochrome layers (no images) ---------- */}
      <div
        aria-hidden
        className="gradient-hero pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="grid-overlay pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="hairline-fade pointer-events-none absolute inset-x-0 top-0 h-px"
      />
      <div
        aria-hidden
        className="hairline-fade pointer-events-none absolute inset-x-0 bottom-0 h-px"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.035] blur-[120px]"
      />

      {/* ---------- Hero ---------- */}
      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <span className="inline-flex animate-fade-in items-center gap-2.5 rounded-full border border-border/70 bg-card/40 px-4 py-1.5 text-[10px] font-medium uppercase tracking-premium text-muted-foreground backdrop-blur-sm transition-premium hover:border-border hover:text-foreground/80 sm:text-[11px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground" />
          </span>
          Private Preview
        </span>

        <h1 className="mt-9 animate-fade-up text-balance text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.045em] text-foreground sm:text-6xl md:text-7xl">
          Fitness ERP
        </h1>

        <div
          className="mt-7 flex animate-fade-up items-center gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <span aria-hidden className="h-px w-8 bg-border sm:w-14" />
          <p className="text-[11px] font-medium uppercase tracking-premium text-muted-foreground sm:text-xs">
            The Gym Operating System
          </p>
          <span aria-hidden className="h-px w-8 bg-border sm:w-14" />
        </div>

        <p
          className="mt-8 max-w-md animate-fade-up text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base"
          style={{ animationDelay: "220ms" }}
        >
          The operating system for the modern gym — memberships, billing,
          attendance and revenue intelligence in one precise, uncompromising
          workspace.
        </p>

        {/* ---------- Action Buttons ---------- */}
        <div
          className="mt-10 flex w-full animate-fade-up flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <Button asChild size="lg" className="w-full sm:w-auto bg-white text-zinc-950 hover:bg-zinc-200">
            <Link href="/signup">Start 3-Day Free Trial</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Link href="/login">Log In to your Gym</Link>
          </Button>
        </div>

        <div
          className="mt-14 w-full max-w-[15rem] animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <Separator className="bg-border/70" />
          <p className="mt-6 text-[10px] uppercase tracking-premium text-muted-foreground/70">
            Early access opens soon
          </p>
        </div>
      </section>

      {/* ---------- Footer micro-copy ---------- */}
      <footer
        className="absolute inset-x-0 bottom-8 z-10 flex animate-fade-in items-center justify-center gap-3 px-6 text-[10px] uppercase tracking-premium text-muted-foreground/60"
        style={{ animationDelay: "460ms" }}
      >
        <span>&copy; {new Date().getFullYear()} Fitness ERP</span>
        <span aria-hidden className="h-3 w-px bg-border" />
        <span>Built for gym owners</span>
      </footer>
    </main>
  );
}