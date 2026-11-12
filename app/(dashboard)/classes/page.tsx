"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type ClassRecord = {
  id: string;
  name: string;
  trainer_name: string | null;
  day_of_week: string | null;
  start_time: string | null;
  capacity: number | null;
};

type MemberRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type EnrollmentRecord = {
  id: string;
  class_id: string;
  member_id: string;
};

const EMPTY_FORM = {
  name: "",
  trainer_name: "",
  day_of_week: "Monday",
  start_time: "18:00",
  capacity: "20",
};

function memberLabel(member?: MemberRecord | null) {
  if (!member) return "Unknown member";
  return member.name || member.email || "Unnamed member";
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${rawMinute ?? "00"} ${suffix}`;
}

export default function ClassesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Class dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Manage Enrollments dialog
  const [manageOpen, setManageOpen] = useState(false);
  const [manageClass, setManageClass] = useState<ClassRecord | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [classRes, enrollmentRes, memberRes] = await Promise.all([
      supabase.from("classes").select("*").order("name", { ascending: true }),
      supabase.from("class_enrollments").select("*"),
      supabase.from("members").select("*"),
    ]);

    const firstError = classRes.error || enrollmentRes.error || memberRes.error;

    if (firstError) {
      setError(firstError.message);
      setClasses([]);
      setEnrollments([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    const sortedMembers = ((memberRes.data ?? []) as MemberRecord[])
      .slice()
      .sort((a, b) => memberLabel(a).localeCompare(memberLabel(b)));

    setClasses((classRes.data ?? []) as ClassRecord[]);
    setEnrollments((enrollmentRes.data ?? []) as EnrollmentRecord[]);
    setMembers(sortedMembers);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const enrollmentsByClass = useMemo(() => {
    const map = new Map<string, EnrollmentRecord[]>();
    enrollments.forEach((enrollment) => {
      const list = map.get(enrollment.class_id);
      if (list) {
        list.push(enrollment);
      } else {
        map.set(enrollment.class_id, [enrollment]);
      }
    });
    return map;
  }, [enrollments]);

  const membersById = useMemo(() => {
    const map = new Map<string, MemberRecord>();
    members.forEach((member) => map.set(member.id, member));
    return map;
  }, [members]);

  // ----- Create class -----

  const handleCreateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const capacity = Number(form.capacity);

    if (!name) {
      setCreateError("Class name is required.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      setCreateError("Capacity must be a number greater than 0.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    const { error: insertError } = await supabase.from("classes").insert({
      name,
      trainer_name: form.trainer_name.trim() || null,
      day_of_week: form.day_of_week,
      start_time: form.start_time || null,
      capacity,
    });

    setCreating(false);

    if (insertError) {
      setCreateError(insertError.message);
      return;
    }

    setIsCreateOpen(false);
    setForm(EMPTY_FORM);
    await loadData();
  };

  const handleDeleteClass = async (cls: ClassRecord) => {
    const confirmed = window.confirm(
      `Delete "${cls.name}"? Its enrollments will also be removed.`
    );
    if (!confirmed) return;

    await supabase.from("class_enrollments").delete().eq("class_id", cls.id);

    const { error: deleteError } = await supabase
      .from("classes")
      .delete()
      .eq("id", cls.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  };

  // ----- Manage enrollments -----

  const openManage = (cls: ClassRecord) => {
    setManageClass(cls);
    setManageError(null);
    setSelectedMemberId("");
    setManageOpen(true);
  };

  const closeManage = (open: boolean) => {
    setManageOpen(open);
    if (!open) {
      setManageClass(null);
      setManageError(null);
      setSelectedMemberId("");
    }
  };

  const manageEnrollments = useMemo(() => {
    if (!manageClass) return [] as EnrollmentRecord[];
    return enrollmentsByClass.get(manageClass.id) ?? [];
  }, [manageClass, enrollmentsByClass]);

  const manageCapacity = manageClass?.capacity ?? 0;
  const isFull = manageCapacity > 0 && manageEnrollments.length >= manageCapacity;

  const availableMembers = useMemo(() => {
    if (!manageClass) return members;
    const enrolledIds = new Set(manageEnrollments.map((item) => item.member_id));
    return members.filter((member) => !enrolledIds.has(member.id));
  }, [manageClass, manageEnrollments, members]);

  const handleAddEnrollment = async () => {
    if (!manageClass || !selectedMemberId) return;

    setSavingEnrollment(true);
    setManageError(null);

    const { count, error: countError } = await supabase
      .from("class_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("class_id", manageClass.id);

    if (countError) {
      setSavingEnrollment(false);
      setManageError(countError.message);
      return;
    }

    if (manageCapacity > 0 && typeof count === "number" && count >= manageCapacity) {
      setSavingEnrollment(false);
      setManageError(
        `This class is full (${manageCapacity} of ${manageCapacity} spots taken).`
      );
      return;
    }

    const { error: insertError } = await supabase
      .from("class_enrollments")
      .insert({ class_id: manageClass.id, member_id: selectedMemberId });

    setSavingEnrollment(false);

    if (insertError) {
      setManageError(insertError.message);
      return;
    }

    setSelectedMemberId("");
    await loadData();
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    setSavingEnrollment(true);
    setManageError(null);

    const { error: deleteError } = await supabase
      .from("class_enrollments")
      .delete()
      .eq("id", enrollmentId);

    setSavingEnrollment(false);

    if (deleteError) {
      setManageError(deleteError.message);
      return;
    }

    await loadData();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="text-sm text-muted-foreground">
            Manage the class schedule and member enrollments.
          </p>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setCreateError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>New Class</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateClass} className="space-y-4">
              <DialogHeader>
                <DialogTitle>New Class</DialogTitle>
                <DialogDescription>
                  Add a class to the weekly schedule.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="name">Class name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Morning HIIT"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer_name">Trainer</Label>
                <Input
                  id="trainer_name"
                  value={form.trainer_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      trainer_name: event.target.value,
                    }))
                  }
                  placeholder="Alex Carter"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="day_of_week">Day</Label>
                  <Select
                    value={form.day_of_week}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, day_of_week: value }))
                    }
                  >
                    <SelectTrigger id="day_of_week">
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time">Start time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_time: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  step={1}
                  value={form.capacity}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, capacity: event.target.value }))
                  }
                  required
                />
              </div>

              {createError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createError}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create Class"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Capacity</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Loading classes…
                </TableCell>
              </TableRow>
            ) : classes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No classes yet. Create your first class.
                </TableCell>
              </TableRow>
            ) : (
              classes.map((cls) => {
                const classEnrollments = enrollmentsByClass.get(cls.id) ?? [];
                const enrolledCount = classEnrollments.length;
                const capacity = cls.capacity ?? 0;
                const classIsFull = capacity > 0 && enrolledCount >= capacity;

                return (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.trainer_name || "—"}</TableCell>
                    <TableCell>{cls.day_of_week || "—"}</TableCell>
                    <TableCell>{formatTime(cls.start_time)}</TableCell>
                    <TableCell className="text-right">
                      {capacity > 0 ? capacity : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          classIsFull
                            ? "font-medium text-destructive"
                            : "font-medium"
                        }
                      >
                        {enrolledCount}
                      </span>
                      {classIsFull && (
                        <span className="ml-2 text-xs text-destructive">Full</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManage(cls)}
                        >
                          Manage Enrollments
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void handleDeleteClass(cls)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={manageOpen} onOpenChange={closeManage}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{manageClass?.name ?? "Enrollments"}</DialogTitle>
            <DialogDescription>
              {manageClass
                ? `${manageEnrollments.length} of ${manageCapacity || "—"} spots filled${
                    manageClass.day_of_week ? ` · ${manageClass.day_of_week}` : ""
                  }${
                    manageClass.start_time
                      ? ` at ${formatTime(manageClass.start_time)}`
                      : ""
                  }`
                : "Manage the members enrolled in this class."}
            </DialogDescription>
          </DialogHeader>

          {manageError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {manageError}
            </p>
          )}

          <div className="space-y-2">
            <Label>Enrolled members</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-2">
              {manageEnrollments.length === 0 ? (
                <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                  No members enrolled yet.
                </p>
              ) : (
                manageEnrollments.map((enrollment) => {
                  const member = membersById.get(enrollment.member_id);
                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {memberLabel(member)}
                        </p>
                        {member?.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={savingEnrollment}
                        onClick={() =>
                          void handleRemoveEnrollment(enrollment.id)
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-member">Add member</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedMemberId || undefined}
                onValueChange={setSelectedMemberId}
                disabled={isFull || availableMembers.length === 0 || savingEnrollment}
              >
                <SelectTrigger id="add-member" className="sm:flex-1">
                  <SelectValue
                    placeholder={
                      isFull
                        ? "Class is full"
                        : availableMembers.length === 0
                          ? "All members already enrolled"
                          : "Select a member"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {memberLabel(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => void handleAddEnrollment()}
                disabled={!selectedMemberId || isFull || savingEnrollment}
              >
                {savingEnrollment ? "Saving…" : "Add"}
              </Button>
            </div>
            {isFull && (
              <p className="text-xs text-destructive">
                Capacity reached — remove a member before adding another.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}