import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle, Tags, EyeOff, RotateCcw, Check, X, Target, TrendingDown, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useCategories } from "@/lib/useCategories";
import { api, refreshNotifications } from "@/lib/api";
import type { Budget as BudgetModel, Category } from "@/lib/types";
import { cn, currentMonth, formatCurrency, budgetStatus, type BudgetStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { CategorySelect } from "@/components/app/CategorySelect";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { useConfirm } from "@/components/app/ConfirmProvider";
import { ForecastOutlook } from "@/components/app/ForecastOutlook";

/** "2026-09" → "September 2026". */
function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

/** Progress indicator colour per budget status. */
const indicatorClass: Record<BudgetStatus, string> = {
  ok: "",
  warning: "[&>[data-slot=progress-indicator]]:bg-warning",
  over: "[&>[data-slot=progress-indicator]]:bg-destructive",
};

export function Budget() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, reload } = useFetch<BudgetModel[]>(`/api/budgets?month=${month}`);
  const cats = useCategories();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<BudgetModel | null>(null);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const reloadAll = () => {
    reload();
    cats.reload();
    refreshNotifications();
  };

  const totals = useMemo(() => {
    const budgets = data ?? [];
    const budget = budgets.reduce((s, b) => s + b.amount, 0);
    const actual = budgets.reduce((s, b) => s + b.actual, 0);
    return { budget, actual, remaining: budget - actual };
  }, [data]);

  const overBudget = useMemo(
    () => (data ?? []).filter((b) => budgetStatus(b.percentUsed) === "over"),
    [data]
  );

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleDelete = async (b: BudgetModel) => {
    if (b.source === "month") {
      const goal = cats.categories.find((c) => c.name === b.category)?.monthlyGoal;
      const ok = await confirm({
        title: `Remove the ${monthName(month)} budget for ${b.category}?`,
        description: goal ? `Your usual ${formatCurrency(goal)} monthly goal will apply again.` : undefined,
        confirmLabel: "Remove",
      });
      if (!ok) return;
      await api.del(`/api/budgets/${b.overrideId}`);
    } else {
      const ok = await confirm({
        title: `Stop budgeting ${b.category} every month?`,
        description: "Past spending stays as it is.",
        confirmLabel: "Remove goal",
      });
      if (!ok) return;
      await api.patch(`/api/categories/${b.categoryId}`, { monthlyGoal: null });
    }
    toast.success("Budget removed");
    reloadAll();
  };

  return (
    <>
      <PageHeader
        title="Budget"
        description="Set monthly goals per category. You'll be notified at 80% and when you go over."
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <Button variant="outline" onClick={() => setManageOpen(true)}>
              <Tags /> Categories
            </Button>
            <Button onClick={openAdd}>
              <Plus /> Set budget
            </Button>
          </>
        }
      />

      {overBudget.length > 0 && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            You're over budget in <span className="font-semibold">{overBudget.map((b) => b.category).join(", ")}</span>.
            Consider adjusting your spending or raising the limit.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total budget" value={totals.budget} icon={Target} />
        <StatCard label="Spent" value={totals.actual} icon={TrendingDown} />
        <StatCard
          label="Remaining"
          value={totals.remaining}
          icon={Banknote}
          tone={totals.remaining >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* The outlook is always about the current month, so only show it there. */}
      {month === currentMonth() && <ForecastOutlook key={`${totals.budget}-${totals.actual}`} />}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && data.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((b) => {
            const status = budgetStatus(b.percentUsed);
            return (
              <Card key={b.id} className="gap-3 p-4 shadow-none">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{b.category}</p>
                      {status === "over" ? (
                        <Badge variant="outline" className="border-destructive/40 text-destructive">
                          Over budget
                        </Badge>
                      ) : status === "warning" ? (
                        <Badge variant="outline" className="border-warning/50 text-warning">
                          Near limit
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground tabular mt-0.5 text-xs">
                      {formatCurrency(b.actual)} of {formatCurrency(b.amount)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={cn(
                        "tabular text-sm font-semibold",
                        status === "over" ? "text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {b.percentUsed}%
                    </span>
                    <RowActions
                      label={`Actions for ${b.category}`}
                      actions={[
                        { label: "Edit", icon: Pencil, onSelect: () => { setEditing(b); setOpen(true); } },
                        { label: "Remove", icon: Trash2, onSelect: () => handleDelete(b), destructive: true },
                      ]}
                    />
                  </div>
                </div>
                <Progress value={Math.min(b.percentUsed, 100)} className={cn("bg-muted", indicatorClass[status])} />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn("tabular", b.remaining >= 0 ? "text-muted-foreground" : "text-destructive")}>
                    {b.remaining >= 0
                      ? `${formatCurrency(b.remaining)} left`
                      : `${formatCurrency(Math.abs(b.remaining))} over`}
                  </span>
                  <Badge variant="secondary" className="font-normal">
                    {b.source === "goal" ? "Every month" : "This month only"}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="py-0 shadow-none">
          <EmptyState
            icon={PiggyBank}
            title="No budgets set"
            description="Set a monthly goal for a category. It repeats every month until you change it."
            action={
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus /> Set budget
              </Button>
            }
          />
        </Card>
      )}

      <BudgetDialog
        open={open}
        budget={editing}
        month={month}
        categories={cats.names.filter((c) => !(data ?? []).some((b) => b.category === c))}
        onOpenChange={setOpen}
        onSaved={() => {
          setOpen(false);
          reloadAll();
        }}
      />

      <CategoriesDialog
        open={manageOpen}
        categories={cats.categories}
        suggestions={cats.suggestions}
        onOpenChange={setManageOpen}
        onChanged={reloadAll}
      />
    </>
  );
}

interface BudgetDialogProps {
  open: boolean;
  budget: BudgetModel | null;
  month: string;
  /** Categories that don't have a budget this month yet (offered when adding). */
  categories: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function BudgetDialog({ open, budget, month, categories, onOpenChange, onSaved }: BudgetDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const payload = {
      month,
      category: budget?.category ?? fd.get("category"),
      amount: fd.get("amount"),
      scope: fd.get("scope"),
    };
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/budgets", payload);
      toast.success(budget ? "Budget updated" : "Budget set");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? `Edit ${budget.category} budget` : "Set budget"}</DialogTitle>
          <DialogDescription>You'll get a notification at 80% and when you go over.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="grid gap-4"
        >
          {!budget && (
            <FormField label="Category" htmlFor="budget-category">
              <CategorySelect id="budget-category" name="category" options={categories} />
            </FormField>
          )}

          <FormField label="Monthly amount" htmlFor="budget-amount">
            <Input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              name="amount"
              min="0"
              step="0.01"
              defaultValue={budget?.amount}
              placeholder="0"
              required
            />
          </FormField>

          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs font-medium">Applies to</Label>
            {/* Radix RadioGroup submits its value under `name` like a native radio. */}
            <RadioGroup name="scope" defaultValue={budget?.source === "month" ? "month" : "every"} className="gap-2">
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="every" id="scope-every" />
                Every month, starting {monthName(month)}
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="month" id="scope-month" />
                Only {monthName(month)}
              </Label>
            </RadioGroup>
          </div>

          <FormError message={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CategoriesDialogProps {
  open: boolean;
  categories: Category[];
  suggestions: string[];
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

/** Add, rename, hide and restore categories, and set each one's monthly goal. */
function CategoriesDialog({ open, categories, suggestions, onOpenChange, onChanged }: CategoriesDialogProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = categories.filter((c) => !c.archived);
  const hidden = categories.filter((c) => c.archived);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (name: string) => {
    if (!name.trim()) return;
    if (await run(() => api.post("/api/categories", { name }))) {
      setNewName("");
      toast.success(`Added ${name.trim()}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setError(null);
          setEditingId(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>Add your own, set a monthly goal, or hide ones you don't use.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            add(newName);
          }}
          className="flex gap-2"
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category, e.g. Vehicle"
            maxLength={40}
            aria-label="New category name"
          />
          <Button type="submit" disabled={busy || !newName.trim()}>
            <Plus /> Add
          </Button>
        </form>

        {suggestions.length > 0 && (
          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs font-medium">Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={busy}
                  onClick={() => add(s)}
                  className="rounded-full font-normal"
                >
                  <Plus /> {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        <FormError message={error} />

        <ul className="-mx-2 max-h-72 divide-y overflow-y-auto">
          {active.map((c) =>
            editingId === c.id ? (
              <CategoryEditRow
                key={c.id}
                category={c}
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSave={async (name, monthlyGoal) => {
                  const ok = await run(() => api.patch(`/api/categories/${c.id}`, { name, monthlyGoal }));
                  if (ok) {
                    setEditingId(null);
                    toast.success("Category saved");
                  }
                }}
              />
            ) : (
              <li key={c.id} className="flex items-center justify-between gap-2 px-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-muted-foreground tabular text-xs">
                    {c.monthlyGoal ? `${formatCurrency(c.monthlyGoal)} / month` : "No monthly goal"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(c.id)} aria-label={`Edit ${c.name}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => run(() => api.patch(`/api/categories/${c.id}`, { archived: true }))}
                    disabled={busy}
                    aria-label={`Hide ${c.name}`}
                    title="Hide — past expenses keep this category"
                  >
                    <EyeOff />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>

        {hidden.length > 0 && (
          <div className="grid gap-1">
            <p className="text-muted-foreground text-xs font-medium">Hidden</p>
            <ul className="-mx-2 divide-y">
              {hidden.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-muted-foreground text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => api.patch(`/api/categories/${c.id}`, { archived: false }))}
                  >
                    <RotateCcw /> Restore
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryEditRow({
  category,
  busy,
  onCancel,
  onSave,
}: {
  category: Category;
  busy: boolean;
  onCancel: () => void;
  onSave: (name: string, monthlyGoal: number | null) => void;
}) {
  const [name, setName] = useState(category.name);
  const [goal, setGoal] = useState(category.monthlyGoal ? String(category.monthlyGoal) : "");

  return (
    <li className="px-2 py-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name.trim(), goal === "" ? null : Number(goal));
        }}
        className="flex items-center gap-2"
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required aria-label="Name" />
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Goal / month"
          className="w-32 shrink-0"
          aria-label="Monthly goal"
        />
        <Button type="submit" variant="ghost" size="icon-sm" disabled={busy} aria-label="Save">
          <Check />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Cancel">
          <X />
        </Button>
      </form>
    </li>
  );
}
