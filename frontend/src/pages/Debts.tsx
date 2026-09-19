import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, HandCoins, Check, RotateCcw, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
import type { Debt, DebtDirection } from "@/lib/types";
import { cn, formatCurrency, formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { ListSkeleton } from "@/components/app/ListSkeleton";
import { useConfirm } from "@/components/app/ConfirmProvider";

export function Debts() {
  const { data, loading, reload } = useFetch<Debt[]>(`/api/debts`);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [open, setOpen] = useState(false);
  const [presetDirection, setPresetDirection] = useState<DebtDirection>("owed_to_me");
  const confirm = useConfirm();

  const { receivable, payable, owedToMe, iOwe } = useMemo(() => {
    const debts = data ?? [];
    const owedToMe = debts.filter((d) => d.direction === "owed_to_me");
    const iOwe = debts.filter((d) => d.direction === "i_owe");
    const sum = (list: Debt[]) => list.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);
    return { receivable: sum(owedToMe), payable: sum(iOwe), owedToMe, iOwe };
  }, [data]);

  const toggleStatus = async (d: Debt) => {
    await api.patch(`/api/debts/${d.id}/toggle`);
    toast.success(d.status === "paid" ? "Marked as pending" : "Marked as settled");
    reload();
  };
  const handleDelete = async (d: Debt) => {
    const ok = await confirm({ title: "Delete this record?", description: `${d.person} · ${formatCurrency(d.amount)}` });
    if (!ok) return;
    await api.del(`/api/debts/${d.id}`);
    toast.success("Record deleted");
    reload();
  };
  const openAdd = (direction: DebtDirection) => {
    setPresetDirection(direction);
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (d: Debt) => {
    setEditing(d);
    setOpen(true);
  };

  return (
    <>
      <PageHeader title="Money Owed" description="Track who owes you and what you owe others" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="To receive" value={receivable} icon={ArrowDownLeft} tone="positive" hint="Pending, owed to you" />
        <StatCard label="To pay" value={payable} icon={ArrowUpRight} tone="negative" hint="Pending, you owe" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DebtList
          title="Owes me"
          description="Money others owe you"
          tone="positive"
          loading={loading && !data}
          debts={owedToMe}
          onAdd={() => openAdd("owed_to_me")}
          onEdit={openEdit}
          onToggle={toggleStatus}
          onDelete={handleDelete}
        />
        <DebtList
          title="I owe"
          description="Money you owe others"
          tone="negative"
          loading={loading && !data}
          debts={iOwe}
          onAdd={() => openAdd("i_owe")}
          onEdit={openEdit}
          onToggle={toggleStatus}
          onDelete={handleDelete}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit record" : "Add record"}</DialogTitle>
          </DialogHeader>
          {/* Content unmounts when closed, so defaults reset for each record. */}
          <DebtForm
            debt={editing}
            presetDirection={presetDirection}
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

interface DebtListProps {
  title: string;
  description: string;
  tone: "positive" | "negative";
  loading: boolean;
  debts: Debt[];
  onAdd: () => void;
  onEdit: (d: Debt) => void;
  onToggle: (d: Debt) => void;
  onDelete: (d: Debt) => void;
}

function DebtList({ title, description, tone, loading, debts, onAdd, onEdit, onToggle, onDelete }: DebtListProps) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus /> Add
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <ListSkeleton rows={3} />
        ) : debts.length ? (
          <ul className="divide-y">
            {debts.map((d) => {
              const paid = d.status === "paid";
              return (
                <li key={d.id} className={cn("flex items-center gap-3 py-3 pr-3 pl-6", paid && "text-muted-foreground")}>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{d.person}</span>
                      <Badge
                        variant={paid ? "secondary" : "outline"}
                        className={cn("shrink-0", !paid && "border-warning/40 text-warning")}
                      >
                        {paid ? "Settled" : "Pending"}
                      </Badge>
                    </p>
                    {(d.description || d.dueDate) && (
                      <p className="text-muted-foreground truncate text-xs">
                        {d.description}
                        {d.description && d.dueDate && " · "}
                        {d.dueDate && `Due ${formatDate(d.dueDate)}`}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "tabular shrink-0 text-sm font-medium",
                      paid ? "line-through" : tone === "positive" ? "text-positive" : "text-destructive"
                    )}
                  >
                    {formatCurrency(d.amount)}
                  </span>
                  <RowActions
                    actions={[
                      { label: paid ? "Mark pending" : "Mark settled", icon: paid ? RotateCcw : Check, onSelect: () => onToggle(d) },
                      { label: "Edit", icon: Pencil, onSelect: () => onEdit(d) },
                      { label: "Delete", icon: Trash2, onSelect: () => onDelete(d), destructive: true },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={HandCoins} title="Nothing here yet" />
        )}
      </CardContent>
    </Card>
  );
}

interface DebtFormProps {
  debt: Debt | null;
  presetDirection: DebtDirection;
  onCancel: () => void;
  onSaved: () => void;
}

function DebtForm({ debt, presetDirection, onCancel, onSaved }: DebtFormProps) {
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
      toast.success(debt ? "Record updated" : "Record added");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Type" htmlFor="direction">
          <NativeSelect id="direction" name="direction" defaultValue={debt?.direction ?? presetDirection}>
            <option value="owed_to_me">Owes me</option>
            <option value="i_owe">I owe</option>
          </NativeSelect>
        </FormField>
        <FormField label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={debt?.status ?? "pending"}>
            <option value="pending">Pending</option>
            <option value="paid">Settled</option>
          </NativeSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Person" htmlFor="person">
          <Input id="person" name="person" defaultValue={debt?.person} placeholder="Name" required autoFocus={!debt} />
        </FormField>
        <FormField label="Amount" htmlFor="amount">
          <Input id="amount" type="number" inputMode="decimal" name="amount" min="0" step="0.01" defaultValue={debt?.amount} placeholder="0" required />
        </FormField>
      </div>

      <FormField label="Description (optional)" htmlFor="description">
        <Input id="description" name="description" defaultValue={debt?.description ?? ""} placeholder="What is this for?" />
      </FormField>

      <FormField label="Due date (optional)" htmlFor="dueDate" hint="Dated entries are placed in that month on the Forecast.">
        <Input id="dueDate" type="date" name="dueDate" defaultValue={debt?.dueDate ? toDateInput(debt.dueDate) : ""} />
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
