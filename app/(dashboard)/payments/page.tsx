"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "Google Pay" },
  { value: "upi", label: "UPI" },
] as const;

type PaymentMethod = (typeof METHODS)[number]["value"];

type MemberOption = { id: string; name: string };

type PaymentRow = {
  id: string;
  member_id: string;
  amount: number | string;
  method: string;
  paid_on: string;
  note: string | null;
  members: { name: string } | { name: string }[] | null;
};

type PaymentForm = {
  memberId: string;
  amount: string;
  method: PaymentMethod;
  paidOn: string;
  note: string;
};

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function emptyForm(): PaymentForm {
  return {
    memberId: "",
    amount: "",
    method: "cash",
    paidOn: todayISO(),
    note: "",
  };
}

function formatINR(value: number | string) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveMemberName(row: PaymentRow) {
  const relation = row.members;
  if (!relation) return "—";
  return Array.isArray(relation)
    ? relation[0]?.name ?? "—"
    : relation.name ?? "—";
}

function methodLabel(method: string) {
  return METHODS.find((m) => m.value === method)?.label ?? method;
}

function methodClasses(method: string) {
  switch (method) {
    case "cash":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "gpay":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "upi":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function PaymentsLedger() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const memberFilter = searchParams.get("member_id");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("payments")
      .select("*, members(name)")
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (memberFilter) {
      query = query.eq("member_id", memberFilter);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setPayments([]);
    } else {
      setPayments((data ?? []) as unknown as PaymentRow[]);
    }

    setLoading(false);
  }, [memberFilter, supabase]);

  const loadMembers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("members")
      .select("id, name")
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setMembers((data ?? []) as MemberOption[]);
  }, [supabase]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const { monthTotal, monthCount } = useMemo(() => {
    const now = new Date();
    return payments.reduce(
      (acc, payment) => {
        const paidOn = new Date(`${payment.paid_on}T00:00:00`);
        if (
          paidOn.getFullYear() === now.getFullYear() &&
          paidOn.getMonth() === now.getMonth()
        ) {
          acc.monthTotal += Number(payment.amount || 0);
          acc.monthCount += 1;
        }
        return acc;
      },
      { monthTotal: 0, monthCount: 0 }
    );
  }, [payments]);

  const filteredMemberName = useMemo(() => {
    if (!memberFilter) return null;
    return (
      members.find((member) => member.id === memberFilter)?.name ??
      "Selected member"
    );
  }, [memberFilter, members]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amount = Number(form.amount);
    if (!form.memberId) {
      setError("Please choose a member.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter an amount greater than zero.");
      return;
    }
    if (!form.paidOn) {
      setError("Please pick the paid-on date.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("payments").insert({
      member_id: form.memberId,
      amount,
      method: form.method,
      paid_on: form.paidOn,
      note: form.note.trim() ? form.note.trim() : null,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDialogOpen(false);
    setForm(emptyForm());
    await loadPayments();
  }

  async function handleDelete(payment: PaymentRow) {
    const label = `${formatINR(payment.amount)} from ${resolveMemberName(payment)}`;
    if (!window.confirm(`Delete payment of ${label}? This cannot be undone.`)) {
      return;
    }

    setBusyId(payment.id);
    setError(null);
    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id);
    setBusyId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadPayments();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Record and track every collection against its member.
          </p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setForm(emptyForm());
            setDialogOpen(true);
          }}
        >
          Record Payment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>This month</CardDescription>
          <CardTitle className="text-3xl tracking-tight">
            {formatINR(monthTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This month:{" "}
            <span className="font-medium text-foreground">
              {formatINR(monthTotal)}
            </span>{" "}
            across{" "}
            <span className="font-medium text-foreground">{monthCount}</span>{" "}
            {monthCount === 1 ? "payment" : "payments"}.
            {memberFilter ? " (Filtered to one member)" : ""}
          </p>
        </CardContent>
      </Card>

      {filteredMemberName ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Showing payments for</span>
          <span className="font-medium">{filteredMemberName}</span>
          <Button asChild variant="link" size="sm" className="px-1">
            <a href="/payments">Clear filter</a>
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading payments…
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {resolveMemberName(payment)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatINR(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${methodClasses(
                          payment.method
                        )}`}
                      >
                        {methodLabel(payment.method)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(payment.paid_on)}
                    </TableCell>
                    <TableCell
                      className="max-w-[240px] truncate text-muted-foreground"
                      title={payment.note ?? ""}
                    >
                      {payment.note ? payment.note : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={busyId === payment.id}
                        onClick={() => void handleDelete(payment)}
                      >
                        {busyId === payment.id ? "Deleting…" : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Log a collection against a member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-member">Member</Label>
              <Select
                value={form.memberId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, memberId: value }))
                }
              >
                <SelectTrigger id="payment-member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No members found
                    </SelectItem>
                  ) : (
                    members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="payment-amount">Amount (₹)</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="1500"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="payment-method">Method</Label>
                <Select
                  value={form.method}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      method: value as PaymentMethod,
                    }))
                  }
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-date">Paid On</Label>
              <Input
                id="payment-date"
                type="date"
                value={form.paidOn}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, paidOn: event.target.value }))
                }
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-note">Note</Label>
              <Input
                id="payment-note"
                placeholder="Monthly fee, admission, PT session…"
                value={form.note}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading payments…
        </div>
      }
    >
      <PaymentsLedger />
    </Suspense>
  );
}
