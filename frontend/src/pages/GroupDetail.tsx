import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus, ArrowLeft, Copy, Check, Trash2, Receipt, HandCoins, Users, LogOut,
} from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { GroupDetail as GroupDetailModel, SplitMode, User } from "../lib/types";
import { formatCurrency, formatDate, toDateInput, cx } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input, Select, Textarea } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";

const nameOf = (u: User) => u.name || u.email;

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<GroupDetailModel>(`/api/groups/${id}`);
  const [addOpen, setAddOpen] = useState(false);
  const [settleWith, setSettleWith] = useState<{ userId: string; name: string; amount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const me = user?.id;

  // What I owe, and what I'm owed, pulled out of the simplified transfer list.
  const iOwe = useMemo(() => (data?.transfers ?? []).filter((t) => t.fromUserId === me), [data, me]);
  const owedToMe = useMemo(() => (data?.transfers ?? []).filter((t) => t.toUserId === me), [data, me]);

  // Payments others claim they sent me, waiting on my confirmation.
  const awaitingMyConfirmation = useMemo(
    () => (data?.settlements ?? []).filter((s) => s.status === "pending" && s.toUserId === me),
    [data, me]
  );
  // Payments I claimed, waiting on the other side.
  const awaitingTheirConfirmation = useMemo(
    () => (data?.settlements ?? []).filter((s) => s.status === "pending" && s.fromUserId === me),
    [data, me]
  );

  const myNet = data?.balances.find((b) => b.userId === me)?.net ?? 0;

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const respond = async (settlementId: string, action: "confirm" | "decline") => {
    setActionError(null);
    try {
      await api.patch(`/api/groups/${id}/settlements/${settlementId}`, { action });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Delete this expense? Balances will be recalculated.")) return;
    setActionError(null);
    try {
      await api.del(`/api/groups/${id}/expenses/${expenseId}`);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const leave = async () => {
    if (!confirm("Leave this group?")) return;
    setActionError(null);
    try {
      await api.post(`/api/groups/${id}/leave`, {});
      window.location.href = "/groups";
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  if (loading && !data) return <div className="card p-6 text-sm text-neutral-400">Loading…</div>;
  if (error) return <div className="card p-6 text-sm text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <Link to="/groups" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-brand">
        <ArrowLeft size={15} /> All groups
      </Link>

      <PageHeader
        title={data.name}
        subtitle={
          myNet > 0
            ? `Overall, you're owed ${formatCurrency(myNet)}`
            : myNet < 0
              ? `Overall, you owe ${formatCurrency(Math.abs(myNet))}`
              : "You're all settled up"
        }
        actions={
          <>
            <button
              onClick={copyCode}
              title="Copy invite code"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs tracking-widest text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {data.inviteCode}
            </button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add Expense
            </Button>
          </>
        }
      />

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Payments waiting on MY confirmation */}
      {awaitingMyConfirmation.length > 0 && (
        <div className="card mb-4 border-amber-300 p-4 dark:border-amber-500/40">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Waiting for your confirmation
          </h2>
          <ul className="space-y-2">
            {awaitingMyConfirmation.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                <span className="text-sm text-neutral-700 dark:text-neutral-200">
                  <span className="font-semibold">{nameOf(s.fromUser)}</span> says they paid you{" "}
                  <span className="font-semibold">{formatCurrency(s.amount)}</span>
                  {s.note && <span className="block text-xs text-neutral-400">“{s.note}”</span>}
                </span>
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => respond(s.id, "confirm")}>
                    <Check size={14} /> Received
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => respond(s.id, "decline")}>
                    Decline
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Settle up */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">You owe</h2>
          {iOwe.length ? (
            <ul className="space-y-2">
              {iOwe.map((t) => {
                const pending = awaitingTheirConfirmation.find((s) => s.toUserId === t.toUserId);
                return (
                  <li key={t.toUserId} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-neutral-700 dark:text-neutral-200">
                      <span className="font-semibold">{t.toName}</span>{" "}
                      <span className="text-red-600 dark:text-red-400">{formatCurrency(t.amount)}</span>
                    </span>
                    {pending ? (
                      <Badge tone="amber">Awaiting confirmation</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSettleWith({ userId: t.toUserId, name: t.toName, amount: t.amount })}
                      >
                        Mark as paid
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">You don't owe anyone in this group.</p>
          )}
          {awaitingTheirConfirmation.length > 0 && (
            <p className="mt-3 text-xs text-neutral-400">
              Payments you've marked stay pending until the other person confirms they received them.
            </p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">You're owed</h2>
          {owedToMe.length ? (
            <ul className="space-y-2">
              {owedToMe.map((t) => (
                <li key={t.fromUserId} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-200">
                    <span className="font-semibold">{t.fromName}</span>{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(t.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Nobody owes you in this group.</p>
          )}
        </div>
      </div>

      {/* Members & balances */}
      <div className="card mb-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          <Users size={15} /> Members
        </h2>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {data.balances.map((b) => (
            <li key={b.userId} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {b.name || b.email} {b.userId === me && <span className="text-xs text-neutral-400">(you)</span>}
                </p>
                <p className="text-xs text-neutral-400">
                  paid {formatCurrency(b.paid)} · share {formatCurrency(b.owed)}
                </p>
              </div>
              <span
                className={cx(
                  "text-sm font-semibold",
                  b.net > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : b.net < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-neutral-400"
                )}
              >
                {b.net > 0 ? `+${formatCurrency(b.net)}` : b.net < 0 ? `−${formatCurrency(Math.abs(b.net))}` : "settled"}
              </span>
            </li>
          ))}
        </ul>
        <button onClick={leave} className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-600">
          <LogOut size={13} /> Leave group
        </button>
      </div>

      {/* Expenses */}
      <div className="card overflow-hidden">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-800 dark:border-neutral-800 dark:text-neutral-100">
          Expenses
        </h2>
        {data.expenses.length ? (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.expenses.map((e) => {
              const myShare = e.splits.find((s) => s.userId === me)?.amount ?? 0;
              const iPaid = e.paidById === me;
              return (
                <li key={e.id} className="group px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{e.description}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {iPaid ? "You" : nameOf(e.paidBy)} paid {formatCurrency(e.amount)} · {formatDate(e.date)} ·{" "}
                        <span className="capitalize">{e.splitMode}</span> split
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {e.splits.map((s) => `${s.userId === me ? "You" : nameOf(s.user)} ${formatCurrency(s.amount)}`).join(" · ")}
                      </p>
                      {e.notes && <p className="mt-1 text-xs italic text-neutral-400">{e.notes}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cx(
                          "text-sm font-semibold",
                          iPaid ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {iPaid ? `+${formatCurrency(e.amount - myShare)}` : `−${formatCurrency(myShare)}`}
                      </span>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        aria-label="Delete expense"
                        className="rounded-md p-1.5 text-neutral-300 opacity-0 transition hover:bg-neutral-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-neutral-700"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No shared expenses yet"
            description="Add the first one — say who paid and who it should be split between."
          />
        )}
      </div>

      {/* Settlement history */}
      {data.settlements.filter((s) => s.status !== "pending").length > 0 && (
        <div className="card mt-4 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            <HandCoins size={15} /> Payment history
          </h2>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.settlements
              .filter((s) => s.status !== "pending")
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-200">
                    {s.fromUserId === me ? "You" : nameOf(s.fromUser)} paid{" "}
                    {s.toUserId === me ? "you" : nameOf(s.toUser)} {formatCurrency(s.amount)}
                  </span>
                  <Badge tone={s.status === "confirmed" ? "green" : "red"}>
                    {s.status === "confirmed" ? "Done" : "Declined"}
                  </Badge>
                </li>
              ))}
          </ul>
        </div>
      )}

      <AddExpenseModal
        open={addOpen}
        group={data}
        currentUserId={me!}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          reload();
        }}
      />

      <SettleModal
        open={!!settleWith}
        groupId={id!}
        target={settleWith}
        onClose={() => setSettleWith(null)}
        onSaved={() => {
          setSettleWith(null);
          reload();
        }}
      />
    </div>
  );
}

// ---- Add expense -------------------------------------------------------------

interface AddExpenseModalProps {
  open: boolean;
  group: GroupDetailModel;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddExpenseModal({ open, group, currentUserId, onClose, onSaved }: AddExpenseModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<string[]>(group.members.map((m) => m.id));
  // Per-user value for custom (exact amount) and percent modes.
  const [values, setValues] = useState<Record<string, string>>({});

  const total = Number(amount) || 0;

  // Live total of the entered shares, so the mismatch is visible before submitting.
  const enteredSum = useMemo(
    () => selected.reduce((s, id) => s + (Number(values[id]) || 0), 0),
    [selected, values]
  );

  const mismatch =
    splitMode === "custom"
      ? Math.abs(enteredSum - total) > 0.005 && total > 0
      : splitMode === "percent"
        ? Math.abs(enteredSum - 100) > 0.01
        : false;

  const toggleMember = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    if (selected.length === 0) {
      setError("Pick at least one person to split with");
      return;
    }
    const payload = {
      description: fd.get("description"),
      amount: fd.get("amount"),
      date: fd.get("date"),
      paidById: fd.get("paidById"),
      splitMode,
      notes: fd.get("notes") || null,
      participants: selected.map((userId) => ({
        userId,
        ...(splitMode === "equal" ? {} : { value: Number(values[userId]) || 0 }),
      })),
    };
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/groups/${group.id}/expenses`, payload);
      // Reset for the next entry.
      setAmount("");
      setValues({});
      setSplitMode("equal");
      setSelected(group.members.map((m) => m.id));
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Preview of the equal split, so people can see what they'll owe.
  const equalShare = selected.length > 0 ? total / selected.length : 0;

  return (
    <Modal open={open} title="Add Shared Expense" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Amount">
            <Input
              type="number"
              name="amount"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </FieldWrap>
          <FieldWrap label="Date">
            <Input type="date" name="date" defaultValue={toDateInput(new Date())} required />
          </FieldWrap>
        </div>

        <FieldWrap label="Description">
          <Input name="description" placeholder="e.g. Dinner at Roadhouse" required />
        </FieldWrap>

        <FieldWrap label="Paid by">
          <Select name="paidById" defaultValue={currentUserId}>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? "You" : nameOf(m)}
              </option>
            ))}
          </Select>
        </FieldWrap>

        {/* Split mode */}
        <div>
          <label className="label">Split</label>
          <div className="flex gap-1 rounded-lg border border-neutral-300 p-1 dark:border-neutral-700">
            {(["equal", "custom", "percent"] as SplitMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSplitMode(m)}
                className={cx(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition",
                  splitMode === m
                    ? "bg-brand text-white"
                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                {m === "custom" ? "Exact amounts" : m === "percent" ? "Percentage" : "Equally"}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="label">Split between</label>
          <ul className="space-y-1.5 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
            {group.members.map((m) => {
              const isOn = selected.includes(m.id);
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggleMember(m.id)}
                    id={`p-${m.id}`}
                    className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor={`p-${m.id}`} className="flex-1 truncate text-sm text-neutral-700 dark:text-neutral-200">
                    {m.id === currentUserId ? "You" : nameOf(m)}
                  </label>

                  {isOn && splitMode === "equal" && (
                    <span className="text-xs text-neutral-400">{formatCurrency(equalShare)}</span>
                  )}
                  {isOn && splitMode !== "equal" && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step={splitMode === "percent" ? "0.01" : "0.01"}
                        value={values[m.id] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                        placeholder="0"
                        className="w-24 py-1 text-sm"
                      />
                      <span className="w-3 text-xs text-neutral-400">{splitMode === "percent" ? "%" : ""}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Live reconciliation hint */}
          {splitMode !== "equal" && (
            <p className={cx("mt-1.5 text-xs", mismatch ? "text-red-600" : "text-neutral-400")}>
              {splitMode === "custom"
                ? `Shares total ${formatCurrency(enteredSum)} of ${formatCurrency(total)}`
                : `Percentages total ${Number(enteredSum.toFixed(2))}% of 100%`}
              {mismatch && " — these must match before you can save."}
            </p>
          )}
        </div>

        <FieldWrap label="Notes (optional)">
          <Textarea name="notes" placeholder="Any extra details…" />
        </FieldWrap>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || mismatch || selected.length === 0}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Settle up ---------------------------------------------------------------

interface SettleModalProps {
  open: boolean;
  groupId: string;
  target: { userId: string; name: string; amount: number } | null;
  onClose: () => void;
  onSaved: () => void;
}

function SettleModal({ open, groupId, target, onClose, onSaved }: SettleModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    if (!target) return;
    const fd = new FormData(form);
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/groups/${groupId}/settlements`, {
        toUserId: target.userId,
        amount: fd.get("amount"),
        note: fd.get("note") || null,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  return (
    <Modal open={open} title={`Pay ${target.name}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Record a payment you've made to <span className="font-semibold">{target.name}</span>. It stays pending
          until they confirm they received it — only then do the balances change.
        </p>

        <FieldWrap label="Amount">
          <Input type="number" name="amount" min="0" step="0.01" defaultValue={target.amount} required autoFocus />
        </FieldWrap>

        <FieldWrap label="Note (optional)">
          <Input name="note" placeholder="e.g. sent via eSewa" />
        </FieldWrap>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Recording…" : "I paid this"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
