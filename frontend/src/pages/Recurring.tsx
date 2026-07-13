import { useState } from "react";
import { Plus, Pencil, Trash2, Repeat, Play, Pause, PlayCircle } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import type { Recurring as RecurringModel, RecurringType } from "../lib/types";
import {
  formatCurrency,
  formatDate,
  toDateInput,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input, Select, Textarea } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";

export function Recurring() {
  const { data, loading, reload } = useFetch<RecurringModel[]>("/api/recurring");
  const [editing, setEditing] = useState<RecurringModel | null>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const runNow = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const res = await api.post<{ expenses: number; income: number }>("/api/recurring/run", {});
      const total = res.expenses + res.income;
      setNotice(
        total === 0
          ? "You're all caught up — no new transactions were due."
          : `Generated ${res.expenses} expense${res.expenses === 1 ? "" : "s"} and ${res.income} income entr${res.income === 1 ? "y" : "ies"}.`
      );
      reload();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const toggle = async (r: RecurringModel) => {
    await api.patch(`/api/recurring/${r.id}/toggle`);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring rule? Transactions it already created are kept.")) return;
    await api.del(`/api/recurring/${id}`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Recurring"
        subtitle="Automate transactions that repeat, like rent or salary"
        actions={
          <>
            <Button variant="secondary" onClick={runNow} disabled={running}>
              <PlayCircle size={16} /> {running ? "Running…" : "Run now"}
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} /> Add
            </Button>
          </>
        }
      />

      {notice && (
        <div className="mb-4 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">
          {notice}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-6 text-sm text-neutral-400">Loading…</div>
        ) : data && data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium">Next run</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.map((r) => (
                  <tr
                    key={r.id}
                    className={
                      "group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 " +
                      (r.active ? "" : "opacity-50")
                    }
                  >
                    <td className="px-4 py-3 text-neutral-800 dark:text-neutral-100">
                      {r.description}
                      <span className="block text-xs text-neutral-400">{r.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={r.type === "income" ? "green" : "neutral"}>{r.type}</Badge>
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-500 dark:text-neutral-400">{r.frequency}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500 dark:text-neutral-400">
                      {r.active ? formatDate(r.nextRun) : <span className="italic">paused</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <IconButton label={r.active ? "Pause" : "Resume"} onClick={() => toggle(r)}>
                          {r.active ? <Pause size={15} /> : <Play size={15} />}
                        </IconButton>
                        <IconButton label="Edit" onClick={() => { setEditing(r); setOpen(true); }}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="Delete" danger onClick={() => handleDelete(r.id)}>
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
          <EmptyState
            icon={Repeat}
            title="No recurring rules"
            description="Add a rule for something that repeats — rent, salary, subscriptions — and generate them with one click."
          />
        )}
      </div>

      <RecurringModal
        open={open}
        rule={editing}
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
      title={label}
      className={
        "rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-700 " +
        (danger ? "hover:text-red-600" : "hover:text-neutral-700 dark:hover:text-neutral-200")
      }
    >
      {children}
    </button>
  );
}

interface RecurringModalProps {
  open: boolean;
  rule: RecurringModel | null;
  onClose: () => void;
  onSaved: () => void;
}

function RecurringModal({ open, rule, onClose, onSaved }: RecurringModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<RecurringType>(rule?.type ?? "expense");

  // Keep the type toggle in sync when a different rule is opened for editing.
  const key = rule?.id ?? "new";

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const payload = {
      type: fd.get("type"),
      frequency: fd.get("frequency"),
      category: fd.get("category"),
      description: fd.get("description"),
      amount: fd.get("amount"),
      paymentMethod: fd.get("paymentMethod") || "Cash",
      notes: fd.get("notes") || null,
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate") || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (rule) await api.put(`/api/recurring/${rule.id}`, payload);
      else await api.post("/api/recurring", payload);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const today = toDateInput(new Date());

  return (
    <Modal open={open} title={rule ? "Edit Recurring Rule" : "Add Recurring Rule"} onClose={onClose}>
      <form
        key={key}
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Type">
            <Select
              name="type"
              defaultValue={rule?.type ?? "expense"}
              onChange={(e) => setType(e.target.value as RecurringType)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </FieldWrap>
          <FieldWrap label="Frequency">
            <Select name="frequency" defaultValue={rule?.frequency ?? "monthly"}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </Select>
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label={type === "income" ? "Source" : "Category"}>
            {type === "income" ? (
              <Input name="category" defaultValue={rule?.category ?? ""} placeholder="e.g. Salary" required />
            ) : (
              <Select name="category" defaultValue={rule?.category ?? EXPENSE_CATEGORIES[0]}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </FieldWrap>
          <FieldWrap label="Amount">
            <Input type="number" name="amount" min="0" step="0.01" defaultValue={rule?.amount} placeholder="0" required />
          </FieldWrap>
        </div>

        <FieldWrap label="Description">
          <Input name="description" defaultValue={rule?.description} placeholder="e.g. Monthly rent" required />
        </FieldWrap>

        {type === "expense" && (
          <FieldWrap label="Payment Method">
            <Select name="paymentMethod" defaultValue={rule?.paymentMethod ?? "Cash"}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FieldWrap>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Start Date">
            <Input type="date" name="startDate" defaultValue={rule ? toDateInput(rule.startDate) : today} required />
          </FieldWrap>
          <FieldWrap label="End Date (optional)">
            <Input type="date" name="endDate" defaultValue={rule?.endDate ? toDateInput(rule.endDate) : ""} />
          </FieldWrap>
        </div>

        <FieldWrap label="Notes (optional)">
          <Textarea name="notes" defaultValue={rule?.notes ?? ""} placeholder="Any extra details…" />
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
