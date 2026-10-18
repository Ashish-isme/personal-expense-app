import { useMemo, useState } from "react";
import { Plus, Minus, Pencil, Trash2, Target, PiggyBank, Flag, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
import type { SavingsGoal } from "@/lib/types";
import { cn, formatCurrency, formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { ListSkeleton } from "@/components/app/ListSkeleton";
import { useConfirm } from "@/components/app/ConfirmProvider";

/** Whole months from today until `iso`, counting a part month as one. 0 once the date has passed. */
function monthsUntil(iso: string): number {
  const now = new Date();
  const end = new Date(iso);
  if (end < now) return 0;
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(1, months + (end.getDate() > now.getDate() ? 1 : 0));
}

type MoveDirection = "add" | "withdraw";

export function Savings() {
  const { data, loading, reload } = useFetch<SavingsGoal[]>(`/api/savings`);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [moving, setMoving] = useState<{ goal: SavingsGoal; direction: MoveDirection } | null>(null);
  const confirm = useConfirm();

  const totals = useMemo(() => {
    const goals = data ?? [];
    const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const target = goals.reduce((s, g) => s + g.targetAmount, 0);
    const toGo = goals.reduce((s, g) => s + Math.max(0, g.targetAmount - g.savedAmount), 0);
    return { saved, target, toGo };
  }, [data]);

  const handleDelete = async (g: SavingsGoal) => {
    const ok = await confirm({ title: "Delete this savings goal?", description: `${g.name} · ${formatCurrency(g.savedAmount)} saved` });
    if (!ok) return;
    await api.del(`/api/savings/${g.id}`);
    toast.success("Savings goal deleted");
    reload();
  };
  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (g: SavingsGoal) => {
    setEditing(g);
    setFormOpen(true);
  };

  const goals = data ?? [];

  return (
    <>
      <PageHeader
        title="Savings"
        description="Put money aside for the things you want"
        actions={
          <Button onClick={openAdd}>
            <Plus /> New goal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Saved" value={totals.saved} icon={PiggyBank} tone="positive" hint="Across all goals" />
        <StatCard label="Still to save" value={totals.toGo} icon={Flag} hint="To reach every target" />
        <StatCard label="Total targets" value={totals.target} icon={Target} className="col-span-2 lg:col-span-1" />
      </div>

      {loading && !data ? (
        <Card className="pb-0">
          <ListSkeleton rows={3} />
        </Card>
      ) : goals.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onMove={(direction) => setMoving({ goal: g, direction })}
              onEdit={() => openEdit(g)}
              onDelete={() => handleDelete(g)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Target}
            title="No savings goals yet"
            description="Something to buy, a yearly trip, education — anything you're saving up for."
            action={
              <Button onClick={openAdd}>
                <Plus /> New goal
              </Button>
            }
          />
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit savings goal" : "New savings goal"}</DialogTitle>
          </DialogHeader>
          <GoalForm
            goal={editing}
            onCancel={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false);
              reload();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{moving?.direction === "withdraw" ? "Take money out" : "Add money"}</DialogTitle>
          </DialogHeader>
          {moving && (
            <MoveForm
              goal={moving.goal}
              direction={moving.direction}
              onCancel={() => setMoving(null)}
              onSaved={() => {
                setMoving(null);
                reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface GoalCardProps {
  goal: SavingsGoal;
  onMove: (direction: MoveDirection) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function GoalCard({ goal: g, onMove, onEdit, onDelete }: GoalCardProps) {
  const percent = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, g.targetAmount - g.savedAmount);
  const reached = remaining === 0;
  const months = g.targetDate ? monthsUntil(g.targetDate) : null;

  let pace: string | null = null;
  if (!reached && g.targetDate) {
    pace = months ? `${formatCurrency(Math.ceil(remaining / months))}/month to reach it on time` : "Target date has passed";
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="truncate">{g.name}</span>
          {reached && (
            <Badge variant="outline" className="border-positive/40 text-positive shrink-0">
              Reached
            </Badge>
          )}
        </CardTitle>
        {g.targetDate && (
          <CardDescription className="flex items-center gap-1">
            <CalendarClock className="size-3.5" /> By {formatDate(g.targetDate)}
          </CardDescription>
        )}
        <CardAction>
          <RowActions
            actions={[
              { label: "Add money", icon: Plus, onSelect: () => onMove("add") },
              ...(g.savedAmount > 0 ? [{ label: "Take out", icon: Minus, onSelect: () => onMove("withdraw") }] : []),
              { label: "Edit", icon: Pencil, onSelect: onEdit },
              { label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true },
            ]}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabular text-xl font-semibold tracking-tight">{formatCurrency(g.savedAmount)}</span>
          <span className="text-muted-foreground tabular text-sm">of {formatCurrency(g.targetAmount)}</span>
        </div>
        <Progress value={percent} className={cn(reached && "[&>[data-slot=progress-indicator]]:bg-positive")} />
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <span>{percent}% saved</span>
          {!reached && <span className="tabular">{formatCurrency(remaining)} to go</span>}
        </div>
        {pace && <p className={cn("text-xs", months ? "text-muted-foreground" : "text-warning")}>{pace}</p>}
        {g.notes && <p className="text-muted-foreground text-sm">{g.notes}</p>}
        <Button variant="outline" size="sm" onClick={() => onMove("add")}>
          <Plus /> Add money
        </Button>
      </CardContent>
    </Card>
  );
}

interface GoalFormProps {
  goal: SavingsGoal | null;
  onCancel: () => void;
  onSaved: () => void;
}

function GoalForm({ goal, onCancel, onSaved }: GoalFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const payload = {
      name: fd.get("name"),
      targetAmount: fd.get("targetAmount"),
      savedAmount: fd.get("savedAmount") || 0,
      targetDate: fd.get("targetDate") || null,
      notes: fd.get("notes") || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (goal) await api.put(`/api/savings/${goal.id}`, payload);
      else await api.post("/api/savings", payload);
      toast.success(goal ? "Savings goal updated" : "Savings goal added");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-4"
    >
      <FormField label="What are you saving for?" htmlFor="name">
        <Input id="name" name="name" defaultValue={goal?.name} placeholder="e.g. New laptop, Yearly trip, Tuition" required autoFocus={!goal} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Target amount" htmlFor="targetAmount">
          <Input id="targetAmount" type="number" inputMode="decimal" name="targetAmount" min="0" step="0.01" defaultValue={goal?.targetAmount} placeholder="0" required />
        </FormField>
        <FormField label="Saved so far" htmlFor="savedAmount">
          <Input id="savedAmount" type="number" inputMode="decimal" name="savedAmount" min="0" step="0.01" defaultValue={goal?.savedAmount ?? ""} placeholder="0" />
        </FormField>
      </div>

      <FormField label="Target date (optional)" htmlFor="targetDate" hint="Shows how much to put aside each month to get there.">
        <Input id="targetDate" type="date" name="targetDate" defaultValue={goal?.targetDate ? toDateInput(goal.targetDate) : ""} />
      </FormField>

      <FormField label="Notes (optional)" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={goal?.notes ?? ""} rows={2} />
      </FormField>

      <FormError message={error} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface MoveFormProps {
  goal: SavingsGoal;
  direction: MoveDirection;
  onCancel: () => void;
  onSaved: () => void;
}

function MoveForm({ goal, direction, onCancel, onSaved }: MoveFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withdraw = direction === "withdraw";

  const submit = async (form: HTMLFormElement) => {
    const amount = Number(new FormData(form).get("amount"));
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/savings/${goal.id}/move`, { amount: withdraw ? -amount : amount });
      toast.success(withdraw ? `Took ${formatCurrency(amount)} out of ${goal.name}` : `Added ${formatCurrency(amount)} to ${goal.name}`);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-4"
    >
      <p className="text-muted-foreground text-sm">
        {goal.name} · {formatCurrency(goal.savedAmount)} of {formatCurrency(goal.targetAmount)} saved
      </p>
      <FormField label="Amount" htmlFor="amount">
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          name="amount"
          min="0.01"
          step="0.01"
          max={withdraw ? goal.savedAmount : undefined}
          placeholder="0"
          required
          autoFocus
        />
      </FormField>

      <FormError message={error} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : withdraw ? "Take out" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}
