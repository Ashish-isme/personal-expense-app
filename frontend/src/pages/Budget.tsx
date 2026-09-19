import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle, Tags, EyeOff, RotateCcw, Check, X } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { useCategories } from "../lib/useCategories";
import { api, refreshNotifications } from "../lib/api";
import type { Budget as BudgetModel, Category } from "../lib/types";
import { currentMonth, formatCurrency, cx, budgetStatus } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input } from "../components/ui/Field";
import { CategorySelect } from "../components/ui/CategorySelect";
import { ProgressBar } from "../components/ui/ProgressBar";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Target, TrendingDown, Banknote } from "lucide-react";

/** "2026-09" → "September 2026". */
function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function Budget() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, reload } = useFetch<BudgetModel[]>(`/api/budgets?month=${month}`);
  const cats = useCategories();
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

  const handleDelete = async (b: BudgetModel) => {
    if (b.source === "month") {
      const goal = cats.categories.find((c) => c.name === b.category)?.monthlyGoal;
      const note = goal ? ` Your usual ${formatCurrency(goal)} monthly goal will apply again.` : "";
      if (!confirm(`Remove the ${monthName(month)} budget for ${b.category}?${note}`)) return;
      await api.del(`/api/budgets/${b.overrideId}`);
    } else {
      if (!confirm(`Stop budgeting ${b.category} every month?`)) return;
      await api.patch(`/api/categories/${b.categoryId}`, { monthlyGoal: null });
    }
    reloadAll();
  };

  return (
    <div>
      <PageHeader
        title="Budget"
        subtitle="Set monthly goals per category. You'll be notified at 80% and when you go over."
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <Button variant="secondary" onClick={() => setManageOpen(true)}>
              <Tags size={16} /> Categories
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus size={16} /> Set Budget
            </Button>
          </>
        }
      />

      {overBudget.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            You're over budget in{" "}
            <span className="font-semibold">
              {overBudget.map((b) => b.category).join(", ")}
            </span>
            . Consider adjusting your spending or raising the limit.
          </span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Budget" value={totals.budget} icon={Target} tone="brand" />
        <StatCard label="Total Spent" value={totals.actual} icon={TrendingDown} tone="negative" />
        <StatCard
          label="Remaining"
          value={totals.remaining}
          icon={Banknote}
          tone={totals.remaining >= 0 ? "positive" : "negative"}
        />
      </div>

      {loading && !data ? (
        <div className="card p-6 text-sm text-neutral-400">Loading…</div>
      ) : data && data.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((b) => (
            <div key={b.id} className="card group p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{b.category}</p>
                  <p className="text-xs text-neutral-400">
                    {formatCurrency(b.actual)} of {formatCurrency(b.amount)} ·{" "}
                    {b.source === "goal" ? "every month" : "this month only"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {budgetStatus(b.percentUsed) === "over" ? (
                    <Badge tone="red">Over budget</Badge>
                  ) : budgetStatus(b.percentUsed) === "warning" ? (
                    <Badge tone="amber">Near limit</Badge>
                  ) : null}
                  <span
                    className={cx(
                      "text-sm font-semibold",
                      b.percentUsed > 100 ? "text-red-600 dark:text-red-400" : "text-neutral-600 dark:text-neutral-300"
                    )}
                  >
                    {b.percentUsed}%
                  </span>
                  {/* Always visible on touch screens, which have no hover. */}
                  <div className="flex gap-1 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditing(b);
                        setOpen(true);
                      }}
                      aria-label="Edit"
                      className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
                      aria-label="Remove"
                      className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <ProgressBar percent={b.percentUsed} />
              <p
                className={cx(
                  "mt-2 text-xs",
                  b.remaining >= 0 ? "text-neutral-400" : "text-red-500"
                )}
              >
                {b.remaining >= 0
                  ? `${formatCurrency(b.remaining)} remaining`
                  : `${formatCurrency(Math.abs(b.remaining))} over budget`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={PiggyBank}
            title="No budgets set"
            description="Set a monthly goal for a category. It repeats every month until you change it."
          />
        </div>
      )}

      <BudgetModal
        open={open}
        budget={editing}
        month={month}
        categories={cats.names.filter((c) => !(data ?? []).some((b) => b.category === c))}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          reloadAll();
        }}
      />

      <CategoriesModal
        open={manageOpen}
        categories={cats.categories}
        suggestions={cats.suggestions}
        onClose={() => setManageOpen(false)}
        onChanged={reloadAll}
      />
    </div>
  );
}

interface BudgetModalProps {
  open: boolean;
  budget: BudgetModel | null;
  month: string;
  /** Categories that don't have a budget this month yet (offered when adding). */
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

function BudgetModal({ open, budget, month, categories, onClose, onSaved }: BudgetModalProps) {
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
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={budget ? `Edit ${budget.category} budget` : "Set Budget"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        {!budget && (
          <FieldWrap label="Category">
            <CategorySelect name="category" options={categories} />
          </FieldWrap>
        )}

        <FieldWrap label="Monthly Budget Amount">
          <Input type="number" name="amount" min="0" step="0.01" defaultValue={budget?.amount} placeholder="0" required />
        </FieldWrap>

        <fieldset className="space-y-2">
          <legend className="label">Applies to</legend>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <input type="radio" name="scope" value="every" defaultChecked={budget?.source !== "month"} />
            Every month, starting {monthName(month)}
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <input type="radio" name="scope" value="month" defaultChecked={budget?.source === "month"} />
            Only {monthName(month)}
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface CategoriesModalProps {
  open: boolean;
  categories: Category[];
  suggestions: string[];
  onClose: () => void;
  onChanged: () => void;
}

/** Add, rename, hide and restore categories, and set each one's monthly goal. */
function CategoriesModal({ open, categories, suggestions, onClose, onChanged }: CategoriesModalProps) {
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
    if (await run(() => api.post("/api/categories", { name }))) setNewName("");
  };

  return (
    <Modal open={open} title="Categories" onClose={onClose}>
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
          <Plus size={16} /> Add
        </Button>
      </form>

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-neutral-400">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => add(s)}
                className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-600 transition hover:border-brand hover:text-brand dark:border-neutral-700 dark:text-neutral-300"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 max-h-80 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
        {active.map((c) =>
          editingId === c.id ? (
            <CategoryEditRow
              key={c.id}
              category={c}
              busy={busy}
              onCancel={() => setEditingId(null)}
              onSave={async (name, monthlyGoal) => {
                const ok = await run(() => api.patch(`/api/categories/${c.id}`, { name, monthlyGoal }));
                if (ok) setEditingId(null);
              }}
            />
          ) : (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-800 dark:text-neutral-100">{c.name}</p>
                <p className="text-xs text-neutral-400">
                  {c.monthlyGoal ? `${formatCurrency(c.monthlyGoal)} / month` : "No monthly goal"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingId(c.id)}
                  aria-label={`Edit ${c.name}`}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => run(() => api.patch(`/api/categories/${c.id}`, { archived: true }))}
                  disabled={busy}
                  aria-label={`Hide ${c.name}`}
                  title="Hide — past expenses keep this category"
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                >
                  <EyeOff size={14} />
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {hidden.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-neutral-400">Hidden</p>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {hidden.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-neutral-400">{c.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => run(() => api.patch(`/api/categories/${c.id}`, { archived: false }))}
                >
                  <RotateCcw size={13} /> Restore
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
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
    <li className="py-2">
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
          min="0"
          step="0.01"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Goal / month"
          className="w-32"
          aria-label="Monthly goal"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Save"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand dark:hover:bg-neutral-700"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700"
        >
          <X size={16} />
        </button>
      </form>
    </li>
  );
}
