import { useState } from "react";
import { Plus, Pencil, Trash2, Repeat, Play, Pause, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
import type { Recurring as RecurringModel, RecurringType } from "@/lib/types";
import { cn, formatCurrency, formatDate, toDateInput, PAYMENT_METHODS } from "@/lib/utils";
import { useCategories } from "@/lib/useCategories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { CategorySelect } from "@/components/app/CategorySelect";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { ListSkeleton } from "@/components/app/ListSkeleton";
import { useConfirm } from "@/components/app/ConfirmProvider";

export function Recurring() {
  const { data, loading, reload } = useFetch<RecurringModel[]>("/api/recurring");
  const [editing, setEditing] = useState<RecurringModel | null>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const confirm = useConfirm();

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await api.post<{ expenses: number; income: number }>("/api/recurring/run", {});
      const total = res.expenses + res.income;
      if (total === 0) toast.info("You're all caught up — no new transactions were due.");
      else
        toast.success(
          `Generated ${res.expenses} expense${res.expenses === 1 ? "" : "s"} and ${res.income} income entr${res.income === 1 ? "y" : "ies"}.`
        );
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const toggle = async (r: RecurringModel) => {
    await api.patch(`/api/recurring/${r.id}/toggle`);
    toast.success(r.active ? "Rule paused" : "Rule resumed");
    reload();
  };

  const handleDelete = async (r: RecurringModel) => {
    const ok = await confirm({
      title: "Delete this recurring rule?",
      description: "Transactions it already created are kept.",
    });
    if (!ok) return;
    await api.del(`/api/recurring/${r.id}`);
    toast.success("Rule deleted");
    reload();
  };

  return (
    <>
      <PageHeader
        title="Recurring"
        description="Automate transactions that repeat, like rent or salary"
        actions={
          <>
            <Button variant="outline" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <PlayCircle />} {running ? "Running…" : "Run now"}
            </Button>
            <Button onClick={openAdd}>
              <Plus /> Add rule
            </Button>
          </>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        {loading && !data ? (
          <ListSkeleton />
        ) : data && data.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Description</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden sm:table-cell">Next run</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id} className={cn(!r.active && "text-muted-foreground")}>
                  <TableCell className="max-w-0 pl-4 whitespace-normal">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{r.description}</span>
                      {!r.active && (
                        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                          Paused
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground hidden truncate text-xs sm:block">
                      {r.category}
                      <span className="capitalize md:hidden"> · {r.frequency}</span>
                    </p>
                    {/* On phones: status first, then when it next runs (the amount's + marks income). */}
                    <p className="text-muted-foreground truncate text-xs sm:hidden">
                      {r.active ? `Next ${formatDate(r.nextRun)}` : "Paused"} · <span className="capitalize">{r.frequency}</span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={r.type === "income" ? "default" : "secondary"} className={cn(r.type === "income" && "bg-positive/15 text-positive")}>
                      {r.type === "income" ? "Income" : "Expense"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden capitalize md:table-cell">{r.frequency}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {r.active ? formatDate(r.nextRun) : "—"}
                  </TableCell>
                  <TableCell className={cn("tabular text-right font-medium", r.type === "income" && r.active && "text-positive")}>
                    {r.type === "income" ? "+" : ""}
                    {formatCurrency(r.amount)}
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <RowActions
                      actions={[
                        { label: r.active ? "Pause" : "Resume", icon: r.active ? Pause : Play, onSelect: () => toggle(r) },
                        { label: "Edit", icon: Pencil, onSelect: () => { setEditing(r); setOpen(true); } },
                        { label: "Delete", icon: Trash2, onSelect: () => handleDelete(r), destructive: true },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Repeat}
            title="No recurring rules"
            description="Add a rule for something that repeats — rent, salary, subscriptions — and it's recorded for you automatically."
            action={
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus /> Add rule
              </Button>
            }
          />
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit recurring rule" : "Add recurring rule"}</DialogTitle>
          </DialogHeader>
          {/* Content unmounts when closed, so the form's state resets for each rule. */}
          <RecurringForm
            rule={editing}
            onCancel={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              reload();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface RecurringFormProps {
  rule: RecurringModel | null;
  onCancel: () => void;
  onSaved: () => void;
}

function RecurringForm({ rule, onCancel, onSaved }: RecurringFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<RecurringType>(rule?.type ?? "expense");
  const { names: categoryNames } = useCategories();

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
      toast.success(rule ? "Rule updated" : "Rule added");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const today = toDateInput(new Date());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Type" htmlFor="type">
          <NativeSelect id="type" name="type" defaultValue={rule?.type ?? "expense"} onChange={(e) => setType(e.target.value as RecurringType)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </NativeSelect>
        </FormField>
        <FormField label="Frequency" htmlFor="frequency">
          <NativeSelect id="frequency" name="frequency" defaultValue={rule?.frequency ?? "monthly"}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </NativeSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={type === "income" ? "Source" : "Category"} htmlFor="category">
          {type === "income" ? (
            <Input id="category" name="category" defaultValue={rule?.type === "income" ? rule.category : ""} placeholder="e.g. Salary" required />
          ) : (
            <CategorySelect id="category" name="category" options={categoryNames} defaultValue={rule?.type === "expense" ? rule.category : undefined} />
          )}
        </FormField>
        <FormField label="Amount" htmlFor="amount">
          <Input id="amount" type="number" inputMode="decimal" name="amount" min="0" step="0.01" defaultValue={rule?.amount} placeholder="0" required />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description">
        <Input id="description" name="description" defaultValue={rule?.description} placeholder="e.g. Monthly rent" required />
      </FormField>

      {type === "expense" && (
        <FormField label="Payment method" htmlFor="paymentMethod">
          <NativeSelect id="paymentMethod" name="paymentMethod" defaultValue={rule?.paymentMethod ?? "Cash"}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start date" htmlFor="startDate">
          <Input id="startDate" type="date" name="startDate" defaultValue={rule ? toDateInput(rule.startDate) : today} required />
        </FormField>
        <FormField label="End date (optional)" htmlFor="endDate">
          <Input id="endDate" type="date" name="endDate" defaultValue={rule?.endDate ? toDateInput(rule.endDate) : ""} />
        </FormField>
      </div>

      <FormField label="Notes (optional)" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={rule?.notes ?? ""} placeholder="Any extra details…" rows={2} />
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
