import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Copy, Check, Trash2, Receipt, Users, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { GroupDetail as GroupDetailModel, SplitMode, User } from "@/lib/types";
import { cn, formatCurrency, formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { ListSkeleton } from "@/components/app/ListSkeleton";
import { useConfirm } from "@/components/app/ConfirmProvider";

const nameOf = (u: User) => u.name || u.email;

/** Green for money coming to you, red for money you owe, muted when settled. */
const netClass = (n: number) => (n > 0 ? "text-positive" : n < 0 ? "text-destructive" : "text-muted-foreground");

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<GroupDetailModel>(`/api/groups/${id}`);
  const [addOpen, setAddOpen] = useState(false);
  const [settleWith, setSettleWith] = useState<{ userId: string; name: string; amount: number } | null>(null);
  const [copied, setCopied] = useState(false);

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
  const history = useMemo(() => (data?.settlements ?? []).filter((s) => s.status !== "pending"), [data]);

  const myNet = data?.balances.find((b) => b.userId === me)?.net ?? 0;

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.inviteCode);
    setCopied(true);
    toast.success("Invite code copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const respond = async (settlementId: string, action: "confirm" | "decline") => {
    try {
      await api.patch(`/api/groups/${id}/settlements/${settlementId}`, { action });
      toast.success(action === "confirm" ? "Payment confirmed" : "Payment declined");
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteExpense = async (expenseId: string, description: string) => {
    const ok = await confirm({ title: "Delete this expense?", description: `${description} — balances will be recalculated.` });
    if (!ok) return;
    try {
      await api.del(`/api/groups/${id}/expenses/${expenseId}`);
      toast.success("Expense deleted");
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const leave = async () => {
    const ok = await confirm({ title: "Leave this group?", description: "You can only leave once you're settled up.", confirmLabel: "Leave" });
    if (!ok) return;
    try {
      await api.post(`/api/groups/${id}/leave`, {});
      toast.success("You left the group");
      navigate("/groups");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading && !data) {
    return (
      <Card className="py-0">
        <ListSkeleton />
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="text-destructive p-6 text-sm">{error}</Card>
    );
  }
  if (!data) return null;

  return (
    <>
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
          <Link to="/groups">
            <ArrowLeft /> All groups
          </Link>
        </Button>
        <PageHeader
          title={data.name}
          description={
            myNet > 0
              ? `Overall, you're owed ${formatCurrency(myNet)}`
              : myNet < 0
                ? `Overall, you owe ${formatCurrency(Math.abs(myNet))}`
                : "You're all settled up"
          }
          actions={
            <>
              <Button variant="outline" onClick={copyCode} title="Copy invite code" className="font-mono tracking-widest">
                {copied ? <Check className="text-positive" /> : <Copy />}
                {data.inviteCode}
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus /> Add expense
              </Button>
            </>
          }
        />
      </div>

      {/* Payments waiting on MY confirmation */}
      {awaitingMyConfirmation.length > 0 && (
        <Card className="border-warning/50 gap-3 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Waiting for your confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            {awaitingMyConfirmation.map((s) => (
              <div key={s.id} className="bg-warning/10 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2.5">
                <div className="text-sm">
                  <span className="font-medium">{nameOf(s.fromUser)}</span> says they paid you{" "}
                  <span className="tabular font-medium">{formatCurrency(s.amount)}</span>
                  {s.note && <p className="text-muted-foreground text-xs">“{s.note}”</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respond(s.id, "confirm")}>
                    <Check /> Received
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respond(s.id, "decline")}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="balances" className="gap-4">
        <TabsList>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({data.expenses.length})</TabsTrigger>
          {history.length > 0 && <TabsTrigger value="history">History</TabsTrigger>}
        </TabsList>

        <TabsContent value="balances" className="space-y-4">
          {/* Settle up */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="gap-3 py-4 shadow-none">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">You owe</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {iOwe.length ? (
                  <ul className="space-y-2">
                    {iOwe.map((t) => {
                      const pending = awaitingTheirConfirmation.find((s) => s.toUserId === t.toUserId);
                      return (
                        <li key={t.toUserId} className="flex items-center justify-between gap-2">
                          <span className="text-sm">
                            <span className="font-medium">{t.toName}</span>{" "}
                            <span className="tabular text-destructive">{formatCurrency(t.amount)}</span>
                          </span>
                          {pending ? (
                            <Badge variant="outline" className="border-warning/50 text-warning">
                              Awaiting confirmation
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
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
                  <p className="text-muted-foreground text-sm">You don't owe anyone in this group.</p>
                )}
                {awaitingTheirConfirmation.length > 0 && (
                  <p className="text-muted-foreground mt-3 text-xs">
                    Payments you've marked stay pending until the other person confirms they received them.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="gap-3 py-4 shadow-none">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">You're owed</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {owedToMe.length ? (
                  <ul className="space-y-2">
                    {owedToMe.map((t) => (
                      <li key={t.fromUserId} className="text-sm">
                        <span className="font-medium">{t.fromName}</span>{" "}
                        <span className="tabular text-positive">{formatCurrency(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">Nobody owes you in this group.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Members & balances */}
          <Card className="gap-3 py-4 shadow-none">
            <CardHeader className="items-center px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4" /> Members
              </CardTitle>
              <CardAction className="self-center">
                <Button variant="ghost" size="xs" onClick={leave} className="text-muted-foreground hover:text-destructive">
                  <LogOut /> Leave group
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-4">
              <ul className="divide-y">
                {data.balances.map((b) => (
                  <li key={b.userId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {b.name || b.email} {b.userId === me && <span className="text-muted-foreground text-xs font-normal">(you)</span>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        paid {formatCurrency(b.paid)} · share {formatCurrency(b.owed)}
                      </p>
                    </div>
                    <span className={cn("tabular shrink-0 text-sm font-medium", netClass(b.net))}>
                      {b.net > 0 ? `+${formatCurrency(b.net)}` : b.net < 0 ? `−${formatCurrency(Math.abs(b.net))}` : "settled"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="gap-0 overflow-hidden py-0 shadow-none">
            {data.expenses.length ? (
              <ul className="divide-y">
                {data.expenses.map((e) => {
                  const myShare = e.splits.find((s) => s.userId === me)?.amount ?? 0;
                  const iPaid = e.paidById === me;
                  return (
                    <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.description}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {iPaid ? "You" : nameOf(e.paidBy)} paid {formatCurrency(e.amount)} · {formatDate(e.date)} ·{" "}
                          <span className="capitalize">{e.splitMode}</span> split
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {e.splits.map((s) => `${s.userId === me ? "You" : nameOf(s.user)} ${formatCurrency(s.amount)}`).join(" · ")}
                        </p>
                        {e.notes && <p className="text-muted-foreground mt-1 text-xs italic">{e.notes}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={cn("tabular text-sm font-medium", iPaid ? "text-positive" : "text-destructive")}>
                          {iPaid ? `+${formatCurrency(e.amount - myShare)}` : `−${formatCurrency(myShare)}`}
                        </span>
                        <RowActions
                          actions={[
                            { label: "Delete", icon: Trash2, onSelect: () => deleteExpense(e.id, e.description), destructive: true },
                          ]}
                        />
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
                action={
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus /> Add expense
                  </Button>
                }
              />
            )}
          </Card>
        </TabsContent>

        {history.length > 0 && (
          <TabsContent value="history">
            <Card className="gap-0 py-0 shadow-none">
              <ul className="divide-y">
                {history.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm">
                      {s.fromUserId === me ? "You" : nameOf(s.fromUser)} paid {s.toUserId === me ? "you" : nameOf(s.toUser)}{" "}
                      <span className="tabular font-medium">{formatCurrency(s.amount)}</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={s.status === "confirmed" ? "border-positive/40 text-positive" : "border-destructive/40 text-destructive"}
                    >
                      {s.status === "confirmed" ? "Done" : "Declined"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AddExpenseDialog
        open={addOpen}
        group={data}
        currentUserId={me!}
        onOpenChange={setAddOpen}
        onSaved={() => {
          setAddOpen(false);
          reload();
        }}
      />

      <SettleDialog
        groupId={id!}
        target={settleWith}
        onClose={() => setSettleWith(null)}
        onSaved={() => {
          setSettleWith(null);
          reload();
        }}
      />
    </>
  );
}

// ---- Add expense -------------------------------------------------------------

interface AddExpenseDialogProps {
  open: boolean;
  group: GroupDetailModel;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const SPLIT_LABELS: Record<SplitMode, string> = { equal: "Equally", custom: "Exact amounts", percent: "Percentage" };

function AddExpenseDialog({ open, group, currentUserId, onOpenChange, onSaved }: AddExpenseDialogProps) {
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
      toast.success("Shared expense added");
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add shared expense</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" htmlFor="g-amount">
              <Input
                id="g-amount"
                type="number"
                inputMode="decimal"
                name="amount"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField label="Date" htmlFor="g-date">
              <Input id="g-date" type="date" name="date" defaultValue={toDateInput(new Date())} required />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="g-description">
            <Input id="g-description" name="description" placeholder="e.g. Dinner at Roadhouse" required />
          </FormField>

          <FormField label="Paid by" htmlFor="g-paidBy">
            <NativeSelect id="g-paidBy" name="paidById" defaultValue={currentUserId}>
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUserId ? "You" : nameOf(m)}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Split">
            <Tabs value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)}>
              <TabsList className="w-full">
                {(["equal", "custom", "percent"] as SplitMode[]).map((m) => (
                  <TabsTrigger key={m} value={m} className="text-xs">
                    {SPLIT_LABELS[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </FormField>

          <FormField label="Split between">
            <ul className="divide-y rounded-md border">
              {group.members.map((m) => {
                const isOn = selected.includes(m.id);
                return (
                  <li key={m.id} className="flex min-h-11 items-center gap-2 px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleMember(m.id)}
                      id={`p-${m.id}`}
                      className="accent-primary size-4"
                    />
                    <label htmlFor={`p-${m.id}`} className="flex-1 truncate text-sm">
                      {m.id === currentUserId ? "You" : nameOf(m)}
                    </label>

                    {isOn && splitMode === "equal" && (
                      <span className="tabular text-muted-foreground text-xs">{formatCurrency(equalShare)}</span>
                    )}
                    {isOn && splitMode !== "equal" && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={values[m.id] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                          placeholder="0"
                          className="h-8 w-24"
                          aria-label={`Share for ${m.id === currentUserId ? "you" : nameOf(m)}`}
                        />
                        <span className="text-muted-foreground w-3 text-xs">{splitMode === "percent" ? "%" : ""}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Live reconciliation hint */}
            {splitMode !== "equal" && (
              <p className={cn("text-xs", mismatch ? "text-destructive" : "text-muted-foreground")}>
                {splitMode === "custom"
                  ? `Shares total ${formatCurrency(enteredSum)} of ${formatCurrency(total)}`
                  : `Percentages total ${Number(enteredSum.toFixed(2))}% of 100%`}
                {mismatch && " — these must match before you can save."}
              </p>
            )}
          </FormField>

          <FormField label="Notes (optional)" htmlFor="g-notes">
            <Textarea id="g-notes" name="notes" placeholder="Any extra details…" rows={2} />
          </FormField>

          <FormError message={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || mismatch || selected.length === 0}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Settle up ---------------------------------------------------------------

interface SettleDialogProps {
  groupId: string;
  target: { userId: string; name: string; amount: number } | null;
  onClose: () => void;
  onSaved: () => void;
}

function SettleDialog({ groupId, target, onClose, onSaved }: SettleDialogProps) {
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
      toast.success("Payment recorded", { description: `Waiting for ${target.name} to confirm.` });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>Pay {target.name}</DialogTitle>
              <DialogDescription>
                Record a payment you've made to {target.name}. It stays pending until they confirm they received it —
                only then do the balances change.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(e.currentTarget);
              }}
              className="grid gap-4"
            >
              <FormField label="Amount" htmlFor="s-amount">
                <Input id="s-amount" type="number" inputMode="decimal" name="amount" min="0" step="0.01" defaultValue={target.amount} required autoFocus />
              </FormField>
              <FormField label="Note (optional)" htmlFor="s-note">
                <Input id="s-note" name="note" placeholder="e.g. sent via eSewa" />
              </FormField>
              <FormError message={error} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Recording…" : "I paid this"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
