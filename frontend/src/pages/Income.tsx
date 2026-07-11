import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import type { Income as IncomeModel } from "../lib/types";
import { currentMonth, formatCurrency, formatDate, toDateInput } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input, Textarea } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";

export function Income() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, reload } = useFetch<IncomeModel[]>(`/api/income?month=${month}`);
  const [editing, setEditing] = useState<IncomeModel | null>(null);
  const [open, setOpen] = useState(false);

  const total = useMemo(() => (data ?? []).reduce((s, i) => s + i.amount, 0), [data]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this income entry?")) return;
    await api.del(`/api/income/${id}`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Income"
        subtitle={`Total this month: ${formatCurrency(total)}`}
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
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
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.map((i) => (
                  <tr key={i.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500 dark:text-neutral-400">{formatDate(i.date)}</td>
                    <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-100">{i.source}</td>
                    <td className="px-4 py-3 text-neutral-400">{i.notes || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(i.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditing(i);
                            setOpen(true);
                          }}
                          aria-label="Edit"
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          aria-label="Delete"
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Wallet} title="No income this month" description="Record your salary or other income." />
        )}
      </div>

      <IncomeModal
        open={open}
        income={editing}
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

interface IncomeModalProps {
  open: boolean;
  income: IncomeModel | null;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}

function IncomeModal({ open, income, month, onClose, onSaved }: IncomeModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultDate = income ? toDateInput(income.date) : toDateInput(`${month}-01T00:00:00`);

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const payload = {
      date: fd.get("date"),
      source: fd.get("source"),
      amount: fd.get("amount"),
      notes: fd.get("notes") || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (income) await api.put(`/api/income/${income.id}`, payload);
      else await api.post("/api/income", payload);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={income ? "Edit Income" : "Add Income"} onClose={onClose}>
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
            <Input type="number" name="amount" min="0" step="0.01" defaultValue={income?.amount} placeholder="0" required />
          </FieldWrap>
        </div>

        <FieldWrap label="Source">
          <Input name="source" defaultValue={income?.source} placeholder="e.g. Salary, Freelance" required />
        </FieldWrap>

        <FieldWrap label="Notes (optional)">
          <Textarea name="notes" defaultValue={income?.notes ?? ""} placeholder="Any extra details…" />
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
