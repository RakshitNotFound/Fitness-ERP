import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Metadata } from "next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Fitness ERP — platform owner admin panel (Step 11).
 *
 * Lists every gym in the `gyms` table and lets the owner flip a gym to paid,
 * which is what the billing gate in `middleware.ts` reads:
 *   - `is_paid = true` + `paid_until` (a `date`) unlocks the app for that gym,
 *   - a gym with `is_paid = false` falls back to its 3-day `trial_ends_at`.
 *
 * Access control: `middleware.ts` rejects any request to `/admin` whose user
 * email is not `process.env.ADMIN_EMAIL`, and the route is exempt from the
 * billing gate so a lapsed gym can still be marked as paid. This page is
 * therefore never reachable by a non-owner — but because it runs with the
 * SERVICE ROLE key (which bypasses RLS), keep it server-only and never import
 * it from a Client Component.
 *
 * `force-dynamic` matters: the gym list must be re-read on every request and
 * must never be cached or statically prerendered at build time.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Fitness ERP",
  description: "Platform owner console: review gyms, trials and paid status.",
};

type GymRow = {
  id: string;
  name: string | null;
  /** Column names vary across schema steps, so read defensively below. */
  owner_email?: string | null;
  email?: string | null;
  trial_ends_at: string | null;
  is_paid: boolean | null;
  paid_until: string | null;
};

/**
 * Service-role client.
 *
 * Shared by the page (read every gym) and by the `markAsPaid` Server Action
 * (write one gym). It deliberately bypasses RLS — that is the point of an
 * owner-only console — so it must only ever be created on the server.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Default value for the date picker: 30 days of access from today (UTC). */
function defaultPaidUntil(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

/** `paid_until` is a bare `date`, `trial_ends_at` is a timestamp — handle both. */
function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Owner email is stored as `owner_email` (or plain `email` on older rows). */
function getOwnerEmail(gym: GymRow): string {
  return gym.owner_email ?? gym.email ?? "—";
}

/**
 * Marks a gym as paid until the date submitted with its table row.
 *
 * Reads `id` and `date` straight out of the submitted FormData, exactly as the
 * per-row `<form>` supplies them, then revalidates `/admin` so the new state is
 * visible immediately after the action round-trips.
 */
async function markAsPaid(formData: FormData): Promise<void> {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();

  if (!id) {
    throw new Error("markAsPaid: missing gym id.");
  }

  const { error } = await supabaseAdmin
    .from("gyms")
    .update({ is_paid: true, paid_until: date || null })
    .eq("id", id);

  if (error) {
    throw new Error(`markAsPaid: could not update gym ${id}: ${error.message}`);
  }

  // `/admin` shows the new status; the other two are the screens whose content
  // depends on the billing gate that just opened up.
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/trial-expired");
}

export default async function AdminPage() {
  const { data: gyms, error } = await supabaseAdmin.from("gyms").select("*");

  const rows = (gyms ?? []) as GymRow[];
  const paidCount = rows.filter((gym) => gym.is_paid).length;
  const upcomingPaidUntil = defaultPaidUntil();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
            Platform owner
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Admin Panel
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Every gym on the platform, its trial window and its paid status.
            Marking a gym as paid unlocks the app for that gym immediately;
            unpaid gyms lose access once their trial ends.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "gym" : "gyms"} · {paidCount} paid
            {" · "}
            {rows.length - paidCount} on trial or lapsed
          </p>
        </header>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Could not load gyms: {error.message}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-300">Gym Name</TableHead>
                <TableHead className="text-slate-300">Owner Email</TableHead>
                <TableHead className="text-slate-300">Trial Ends</TableHead>
                <TableHead className="text-slate-300">Is Paid</TableHead>
                <TableHead className="text-slate-300">Paid Until</TableHead>
                <TableHead className="text-right text-slate-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No gyms yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((gym) => (
                  <TableRow
                    key={gym.id}
                    className="border-slate-800 hover:bg-slate-900"
                  >
                    <TableCell className="font-medium text-white">
                      {gym.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {getOwnerEmail(gym)}
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-400">
                      {formatDate(gym.trial_ends_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          gym.is_paid
                            ? "inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300"
                            : "inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300"
                        }
                      >
                        {gym.is_paid ? "Paid" : "Trial"}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-400">
                      {formatDate(gym.paid_until)}
                    </TableCell>
                    <TableCell>
                      <form
                        action={markAsPaid}
                        className="flex flex-wrap items-center justify-end gap-2"
                      >
                        <input type="hidden" name="id" value={gym.id} />
                        <input
                          type="date"
                          name="date"
                          required
                          defaultValue={gym.paid_until ?? upcomingPaidUntil}
                          aria-label={`Paid until date for ${gym.name ?? "gym"}`}
                          className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 shadow-sm outline-none [color-scheme:dark] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <button
                          type="submit"
                          className="h-9 whitespace-nowrap rounded-md bg-emerald-500 px-3 text-sm font-medium text-slate-950 shadow-sm transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        >
                          Mark Paid
                        </button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Marking a gym as paid writes{" "}
          <code className="font-mono text-slate-400">is_paid = true</code> and sets{" "}
          <code className="font-mono text-slate-400">paid_until</code> to the chosen
          date. The change takes effect the next time that gym reloads the app.
        </p>
      </div>
    </main>
  );
}

