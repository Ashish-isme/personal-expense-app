import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import type { Budget as BudgetModel } from "../lib/types";
import { currentMonth, formatCurrency, EXPENSE_CATEGORIES, cx, budgetStatus } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input, Select } from "../components/ui/Field";
import { ProgressBar } from "../components/ui/ProgressBar";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Target, TrendingDown, Banknote } from "lucide-react";

export function Budget() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, reload } = useFetch<BudgetModel[]>(`/api/budgets?month=${month}`);
  const [editing, setEditing] = useState<BudgetModel | null>(null);
  const [open, setOpen] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    await api.del(`/api/budgets/${id}`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Budget"
        subtitle="Set monthly limits per category and track your progress"
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
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
                    {formatCurrency(b.actual)} of {formatCurrency(b.amount)}
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
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
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
                      onClick={() => handleDelete(b.id)}
                      aria-label="Delete"
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
          <EmptyState icon={PiggyBank} title="No budgets set" description="Create a budget for a category to start tracking." />
        </div>
      )}

      <BudgetModal
        open={open}
        budget={editing}
        month={month}
        existing={data ?? []}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

interface BudgetModalProps {
  open: boolean;
  budget: BudgetModel | null;
  month: string;
  existing: BudgetModel[];
  onClose: () => void;
  onSaved: () => void;
}

function BudgetModal({ open, budget, month, existing, onClose, onSaved }: BudgetModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When adding, only offer categories that don't already have a budget this month.
  const usedCategories = new Set(existing.map((b) => b.category));
  const available = budget ? EXPENSE_CATEGORIES : EXPENSE_CATEGORIES.filter((c) => !usedCategories.has(c));

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const payload = {
      month,
      category: fd.get("category"),
      amount: fd.get("amount"),
    };
    setSaving(true);
    setError(null);
    try {
      // POST upserts by (month, category), which covers both add and edit.
      await api.post("/api/budgets", payload);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={budget ? "Edit Budget" : "Set Budget"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <FieldWrap label="Category">
          <Select name="category" defaultValue={budget?.category ?? available[0]} disabled={!!budget}>
            {(budget ? [budget.category] : available).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Monthly Budget Amount">
          <Input type="number" name="amount" min="0" step="0.01" defaultValue={budget?.amount} placeholder="0" required />
        </FieldWrap>

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
