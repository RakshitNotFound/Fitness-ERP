"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Plan = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
};

export default function PlansPage() {
  const supabase = useMemo(() => createClient(), []);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New plan dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [price, setPrice] = useState("");

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plans")
      .select("id, name, duration_days, price")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setPlans([]);
    } else {
      setError(null);
      setPlans((data ?? []) as Plan[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function resetForm() {
    setName("");
    setDurationDays("");
    setPrice("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("plans").insert({
      name: name.trim(),
      duration_days: Number(durationDays),
      price: Number(price),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    await fetchPlans();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this plan? Members linked to it will lose their plan."
    );
    if (!confirmed) return;

    const { error } = await supabase.from("plans").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    await fetchPlans();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Manage the membership plans offered by your gym.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Plan</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Plan</DialogTitle>
              <DialogDescription>
                Create a membership plan with a duration and price.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  placeholder="Monthly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-duration">Duration (days)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="30"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-price">Price</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="49.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration (days)</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading plans...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No plans yet. Create your first plan.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.duration_days}</TableCell>
                  <TableCell>{Number(plan.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
