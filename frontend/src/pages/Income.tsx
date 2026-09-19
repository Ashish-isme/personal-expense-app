import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
import type { Income as IncomeModel } from "@/lib/types";
import { currentMonth, formatCurrency, formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/PageHeader";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { EmptyState } from "@/components/app/EmptyState";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { ListSkeleton } from "@/components/app/ListSkeleton";
import { useConfirm } from "@/components/app/ConfirmProvider";

export function Income() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, reload } = useFetch<IncomeModel[]>(`/api/income?month=${month}`);
  const [editing, setEditing] = useState<IncomeModel | null>(null);
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();

  const total = useMemo(() => (data ?? []).reduce((s, i) => s + i.amount, 0), [data]);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleDelete = async (i: IncomeModel) => {
    const ok = await confirm({ title: "Delete this income entry?", description: `${i.source} · ${formatCurrency(i.amount)}` });
    if (!ok) return;
    await api.del(`/api/income/${i.id}`);
    toast.success("Income deleted");
    reload();
  };

  return (
    <>
      <PageHeader
        title="Income"
        description={`${formatCurrency(total)} received this month`}
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <Button onClick={openAdd}>
              <Plus /> Add income
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
                <TableHead className="hidden pl-4 sm:table-cell">Date</TableHead>
                <TableHead className="pl-4 sm:pl-2">Source</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-muted-foreground hidden pl-4 sm:table-cell">{formatDate(i.date)}</TableCell>
                  <TableCell className="max-w-0 pl-4 whitespace-normal sm:pl-2">
                    <p className="truncate font-medium">{i.source}</p>
                    {/* On phones the date (and notes) fold under the source. */}
                    <p className="text-muted-foreground truncate text-xs md:hidden">
                      <span className="sm:hidden">{formatDate(i.date)}</span>
                      {i.notes && (
                        <>
                          <span className="sm:hidden"> · </span>
                          {i.notes}
                        </>
                      )}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-0 truncate md:table-cell">{i.notes || "—"}</TableCell>
                  <TableCell className="tabular text-positive text-right font-medium">+{formatCurrency(i.amount)}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <RowActions
                      actions={[
                        { label: "Edit", icon: Pencil, onSelect: () => { setEditing(i); setOpen(true); } },
                        { label: "Delete", icon: Trash2, onSelect: () => handleDelete(i), destructive: true },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No income this month"
            description="Record your salary or other income. For a monthly salary, add it once on the Recurring page."
            action={
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus /> Add income
              </Button>
            }
          />
        )}
      </Card>

      <IncomeDialog
        open={open}
        income={editing}
        month={month}
        onOpenChange={setOpen}
        onSaved={() => {
          setOpen(false);
          reload();
        }}
      />
    </>
  );
}

interface IncomeDialogProps {
  open: boolean;
  income: IncomeModel | null;
  month: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function IncomeDialog({ open, income, month, onOpenChange, onSaved }: IncomeDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New entries default to today when viewing the current month, else the 1st of the viewed month.
  const defaultDate = income
    ? toDateInput(income.date)
    : month === currentMonth()
      ? toDateInput(new Date())
      : toDateInput(`${month}-01T00:00:00`);

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
      toast.success(income ? "Income updated" : "Income added");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{income ? "Edit income" : "Add income"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" htmlFor="amount">
              <Input id="amount" type="number" inputMode="decimal" name="amount" min="0" step="0.01" defaultValue={income?.amount} placeholder="0" required autoFocus={!income} />
            </FormField>
            <FormField label="Date" htmlFor="date">
              <Input id="date" type="date" name="date" defaultValue={defaultDate} required />
            </FormField>
          </div>

          <FormField label="Source" htmlFor="source">
            <Input id="source" name="source" defaultValue={income?.source} placeholder="e.g. Salary, Freelance" required />
          </FormField>

          <FormField label="Notes (optional)" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={income?.notes ?? ""} placeholder="Any extra details…" rows={2} />
          </FormField>

          <FormError message={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
