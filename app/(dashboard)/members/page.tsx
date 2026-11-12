"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type MemberStatus = "active" | "inactive";

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  join_date: string | null;
  status: string | null;
};

type MemberForm = {
  name: string;
  phone: string;
  email: string;
  joinDate: string;
  status: MemberStatus;
};

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function emptyForm(): MemberForm {
  return {
    name: "",
    phone: "",
    email: "",
    joinDate: todayISO(),
    status: "active",
  };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MembersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("members")
      .select("id, name, phone, email, join_date, status")
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setMembers([]);
    } else {
      setMembers((data ?? []) as MemberRow[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => {
      return (
        member.name.toLowerCase().includes(term) ||
        (member.phone ?? "").toLowerCase().includes(term) ||
        (member.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [members, search]);

  const activeCount = useMemo(
    () => members.filter((member) => member.status !== "inactive").length,
    [members]
  );

  function openAddDialog() {
    setError(null);
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEditDialog(member: MemberRow) {
    setError(null);
    setEditing(member);
    setForm({
      name: member.name ?? "",
      phone: member.phone ?? "",
      email: member.email ?? "",
      joinDate: member.join_date ?? todayISO(),
      status: member.status === "inactive" ? "inactive" : "active",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Member name is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() ? form.phone.trim() : null,
      email: form.email.trim() ? form.email.trim() : null,
      join_date: form.joinDate || null,
      status: form.status,
    };

    setSaving(true);
    const { error: saveError } = editing
      ? await supabase.from("members").update(payload).eq("id", editing.id)
      : await supabase.from("members").insert(payload);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
    await loadMembers();
  }

  async function handleDelete(member: MemberRow) {
    if (
      !window.confirm(
        `Delete ${member.name}? Their attendance and payment records may also be removed.`
      )
    ) {
      return;
    }

    setBusyId(member.id);
    setError(null);
    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", member.id);
    setBusyId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadMembers();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage your gym roster and jump straight into a member&apos;s payments.
          </p>
        </div>
        <Button onClick={openAddDialog}>Add Member</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Active members</CardDescription>
          <CardTitle className="text-3xl tracking-tight">{activeCount}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {members.length} total · {activeCount} active ·{" "}
            {members.length - activeCount} inactive.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} members
        </p>
      </div>

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
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Status</TableHead>
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
                    Loading members…
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.phone ? member.phone : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email ? member.email : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(member.join_date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          member.status === "inactive"
                            ? "bg-muted text-muted-foreground ring-border"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        }`}
                      >
                        {member.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/payments?member_id=${member.id}`}>
                            View Payments
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(member)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === member.id}
                          onClick={() => void handleDelete(member)}
                        >
                          {busyId === member.id ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
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
            <DialogTitle>{editing ? "Edit Member" : "Add Member"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this member's details."
                : "Add a new member to your roster."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                placeholder="Rahul Sharma"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="member-phone">Phone</Label>
                <Input
                  id="member-phone"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="rahul@example.com"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="member-join-date">Join Date</Label>
                <Input
                  id="member-join-date"
                  type="date"
                  value={form.joinDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, joinDate: event.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="member-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value as MemberStatus,
                    }))
                  }
                >
                  <SelectTrigger id="member-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
