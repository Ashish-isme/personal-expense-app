import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, HandCoins, Check, RotateCcw, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import type { Debt, DebtDirection } from "../lib/types";
import { formatCurrency, formatDate, toDateInput, cx } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input, Select } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState } from "../components/ui/EmptyState";

export function Debts() {
  const { data, loading, reload } = useFetch<Debt[]>(`/api/debts`);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [open, setOpen] = useState(false);
  const [presetDirection, setPresetDirection] = useState<DebtDirection>("owed_to_me");

  const { receivable, payable, owedToMe, iOwe } = useMemo(() => {
    const debts = data ?? [];
    const owedToMe = debts.filter((d) => d.direction === "owed_to_me");
    const iOwe = debts.filter((d) => d.direction === "i_owe");
    const sum = (list: Debt[]) => list.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);
    return { receivable: sum(owedToMe), payable: sum(iOwe), owedToMe, iOwe };
  }, [data]);

  const toggleStatus = async (id: string) => {
    await api.patch(`/api/debts/${id}/toggle`);
    reload();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await api.del(`/api/debts/${id}`);
    reload();
  };
  const openAdd = (direction: DebtDirection) => {
    setPresetDirection(direction);
    setEditing(null);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Money Owed" subtitle="Track who owes you and what you owe others" />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Money to Receive" value={receivable} icon={ArrowDownLeft} tone="positive" />
        <StatCard label="Money to Pay" value={payable} icon={ArrowUpRight} tone="negative" />
      </div>

      {loading && !data ? (
        <div className="card p-6 text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DebtColumn
            title="Owes Me"
            accent="positive"
            debts={owedToMe}
            onAdd={() => openAdd("owed_to_me")}
            onEdit={(d) => {
              setEditing(d);
              setOpen(true);
            }}
            onToggle={toggleStatus}
            onDelete={handleDelete}
          />
          <DebtColumn
            title="I Owe"
            accent="negative"
            debts={iOwe}
            onAdd={() => openAdd("i_owe")}
            onEdit={(d) => {
              setEditing(d);
              setOpen(true);
            }}
            onToggle={toggleStatus}
            onDelete={handleDelete}
          />
        </div>
      )}

      <DebtModal
        open={open}
        debt={editing}
        presetDirection={presetDirection}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

interface DebtColumnProps {
  title: string;
  accent: "positive" | "negative";
  debts: Debt[];
  onAdd: () => void;
  onEdit: (d: Debt) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function DebtColumn({ title, accent, debts, onAdd, onEdit, onToggle, onDelete }: DebtColumnProps) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {debts.length ? (
        <ul className="space-y-2">
          {debts.map((d) => (
            <li
              key={d.id}
              className={cx(
                "group rounded-lg border border-neutral-200 p-3 dark:border-neutral-800",
                d.status === "paid" && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{d.person}</p>
                    <Badge tone={d.status === "paid" ? "green" : "amber"}>{d.status === "paid" ? "Settled" : "Pending"}</Badge>
                  </div>
                  {d.description && <p className="truncate text-xs text-neutral-400">{d.description}</p>}
                  {d.dueDate && <p className="mt-0.5 text-xs text-neutral-400">Due {formatDate(d.dueDate)}</p>}
                </div>
                <div className="text-right">
                  <p
                    className={cx(
                      "text-sm font-semibold",
                      accent === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatCurrency(d.amount)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => onToggle(d.id)}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600 dark:hover:bg-neutral-700"
                  aria-label={d.status === "paid" ? "Mark pending" : "Mark settled"}
                  title={d.status === "paid" ? "Mark pending" : "Mark settled"}
                >
                  {d.status === "paid" ? <RotateCcw size={14} /> : <Check size={14} />}
                </button>
                <button
                  onClick={() => onEdit(d)}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(d.id)}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={HandCoins} title="Nothing here yet" />
      )}
    </div>
  );
}

interface DebtModalProps {
  open: boolean;
  debt: Debt | null;
  presetDirection: DebtDirection;
  onClose: () => void;
  onSaved: () => void;
}

function DebtModal({ open, debt, presetDirection, onClose, onSaved }: DebtModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const dueDate = fd.get("dueDate");
    const payload = {
      person: fd.get("person"),
      amount: fd.get("amount"),
      description: fd.get("description") || null,
      dueDate: dueDate ? dueDate : null,
      direction: fd.get("direction"),
      status: fd.get("status"),
    };
    setSaving(true);
    setError(null);
    try {
      if (debt) await api.put(`/api/debts/${debt.id}`, payload);
      else await api.post("/api/debts", payload);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={debt ? "Edit Record" : "Add Record"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Type">
            <Select name="direction" defaultValue={debt?.direction ?? presetDirection}>
              <option value="owed_to_me">Owes me</option>
              <option value="i_owe">I owe</option>
            </Select>
          </FieldWrap>
          <FieldWrap label="Status">
            <Select name="status" defaultValue={debt?.status ?? "pending"}>
              <option value="pending">Pending</option>
              <option value="paid">Settled</option>
            </Select>
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Person">
            <Input name="person" defaultValue={debt?.person} placeholder="Name" required />
          </FieldWrap>
          <FieldWrap label="Amount">
            <Input type="number" name="amount" min="0" step="0.01" defaultValue={debt?.amount} placeholder="0" required />
          </FieldWrap>
        </div>

        <FieldWrap label="Description (optional)">
          <Input name="description" defaultValue={debt?.description ?? ""} placeholder="What is this for?" />
        </FieldWrap>

        <FieldWrap label="Due Date (optional)">
          <Input type="date" name="dueDate" defaultValue={debt?.dueDate ? toDateInput(debt.dueDate) : ""} />
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
