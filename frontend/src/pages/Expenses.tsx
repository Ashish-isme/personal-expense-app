import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import type { Expense, PaymentMethod } from "../lib/types";
import {
  currentMonth,
  formatCurrency,
  formatDate,
  toDateInput,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input, Select, Textarea } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";

const methodTone: Record<PaymentMethod, "green" | "blue" | "amber" | "neutral"> = {
  Cash: "green",
  Bank: "blue",
  eSewa: "amber",
  Khalti: "neutral",
};

export function Expenses() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, reload } = useFetch<Expense[]>(`/api/expenses?month=${month}`);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const total = useMemo(() => (data ?? []).reduce((s, e) => s + e.amount, 0), [data]);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await api.del(`/api/expenses/${id}`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`Total this month: ${formatCurrency(total)}`}
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <Button onClick={openAdd}>
              <Plus size={16} /> Add
            </Button>
          </>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-6 text-sm text-neutral-400">Loading…</div>
        ) : data && data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.map((e) => (
                  <tr key={e.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500 dark:text-neutral-400">{formatDate(e.date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{e.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-800 dark:text-neutral-100">
                      {e.description}
                      {e.notes && <span className="block text-xs text-neutral-400">{e.notes}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={methodTone[e.paymentMethod]}>{e.paymentMethod}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <IconButton label="Edit" onClick={() => openEdit(e)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="Delete" danger onClick={() => handleDelete(e.id)}>
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Receipt} title="No expenses this month" description="Add your first expense to get started." />
        )}
      </div>

      <ExpenseModal
        open={open}
        expense={editing}
        month={month}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        "rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-700 " +
        (danger ? "hover:text-red-600" : "hover:text-neutral-700 dark:hover:text-neutral-200")
      }
    >
      {children}
    </button>
  );
}

interface ExpenseModalProps {
  open: boolean;
  expense: Expense | null;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Add / edit form for a single expense. */
function ExpenseModal({ open, expense, month, onClose, onSaved }: ExpenseModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default new expenses to the first day of the currently viewed month.
  const defaultDate = expense ? toDateInput(expense.date) : toDateInput(`${month}-01T00:00:00`);

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const payload = {
      date: fd.get("date"),
      category: fd.get("category"),
      description: fd.get("description"),
      amount: fd.get("amount"),
      paymentMethod: fd.get("paymentMethod"),
      notes: fd.get("notes") || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (expense) await api.put(`/api/expenses/${expense.id}`, payload);
      else await api.post("/api/expenses", payload);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={expense ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Date">
            <Input type="date" name="date" defaultValue={defaultDate} required />
          </FieldWrap>
          <FieldWrap label="Amount">
            <Input type="number" name="amount" min="0" step="0.01" defaultValue={expense?.amount} placeholder="0" required />
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Category">
            <Select name="category" defaultValue={expense?.category ?? EXPENSE_CATEGORIES[0]}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Payment Method">
            <Select name="paymentMethod" defaultValue={expense?.paymentMethod ?? "Cash"}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FieldWrap>
        </div>

        <FieldWrap label="Description">
          <Input name="description" defaultValue={expense?.description} placeholder="What was it for?" required />
        </FieldWrap>

        <FieldWrap label="Notes (optional)">
          <Textarea name="notes" defaultValue={expense?.notes ?? ""} placeholder="Any extra details…" />
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
