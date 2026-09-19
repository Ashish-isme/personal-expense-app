import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Receipt, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api, refreshNotifications } from "@/lib/api";
import type { Expense } from "@/lib/types";
import { currentMonth, formatCurrency, formatDate, toDateInput, PAYMENT_METHODS } from "@/lib/utils";
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
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { EmptyState } from "@/components/app/EmptyState";
import { CategorySelect } from "@/components/app/CategorySelect";
import { FormError, FormField } from "@/components/app/FormField";
import { RowActions } from "@/components/app/RowActions";
import { ListSkeleton } from "@/components/app/ListSkeleton";
import { useConfirm } from "@/components/app/ConfirmProvider";

export function Expenses() {
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const confirm = useConfirm();

  const hasFilters = Boolean(search || category || minAmount || maxAmount);

  const query = useMemo(() => {
    const params = new URLSearchParams({ month });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    return params.toString();
  }, [month, search, category, minAmount, maxAmount]);

  const { data, loading, reload } = useFetch<Expense[]>(`/api/expenses?${query}`);
  const { names: categoryNames, reload: reloadCategories } = useCategories();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const total = useMemo(() => (data ?? []).reduce((s, e) => s + e.amount, 0), [data]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMinAmount("");
    setMaxAmount("");
  };

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleDelete = async (e: Expense) => {
    const ok = await confirm({ title: "Delete this expense?", description: `${e.description} · ${formatCurrency(e.amount)}` });
    if (!ok) return;
    await api.del(`/api/expenses/${e.id}`);
    toast.success("Expense deleted");
    reload();
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description={`${formatCurrency(total)} spent${hasFilters ? " (filtered)" : ""} this month`}
        actions={
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <Button onClick={openAdd}>
              <Plus /> Add expense
            </Button>
          </>
        }
      />

      {/* Search & filters */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:min-w-56 sm:flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or notes…"
            className="pl-9"
            aria-label="Search expenses"
          />
        </div>
        <NativeSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="col-span-2 sm:w-44"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min" min="0" className="sm:w-24" aria-label="Minimum amount" />
        <Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Max" min="0" className="sm:w-24" aria-label="Maximum amount" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="col-span-2 sm:col-span-1">
            <X /> Clear
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {loading && !data ? (
          <ListSkeleton />
        ) : data && data.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="hidden pl-4 sm:table-cell">Date</TableHead>
                <TableHead className="pl-4 sm:pl-2">Description</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground hidden pl-4 sm:table-cell">{formatDate(e.date)}</TableCell>
                  <TableCell className="max-w-0 pl-4 whitespace-normal sm:pl-2">
                    <p className="truncate font-medium">{e.description}</p>
                    {/* On phones the date and category fold under the description. */}
                    <p className="text-muted-foreground truncate text-xs md:hidden">
                      <span className="sm:hidden">{formatDate(e.date)} · </span>
                      {e.category}
                    </p>
                    {e.notes && <p className="text-muted-foreground hidden truncate text-xs md:block">{e.notes}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">{e.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">{e.paymentMethod}</TableCell>
                  <TableCell className="tabular text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <RowActions
                      actions={[
                        { label: "Edit", icon: Pencil, onSelect: () => { setEditing(e); setOpen(true); } },
                        { label: "Delete", icon: Trash2, onSelect: () => handleDelete(e), destructive: true },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Receipt}
            title={hasFilters ? "No matching expenses" : "No expenses this month"}
            description={hasFilters ? "Try adjusting or clearing your filters." : "Add your first expense to get started."}
            action={
              !hasFilters && (
                <Button variant="outline" size="sm" onClick={openAdd}>
                  <Plus /> Add expense
                </Button>
              )
            }
          />
        )}
      </Card>

      <ExpenseDialog
        open={open}
        expense={editing}
        month={month}
        categories={categoryNames}
        onOpenChange={setOpen}
        onSaved={() => {
          setOpen(false);
          reload();
          reloadCategories();
        }}
      />
    </>
  );
}

interface ExpenseDialogProps {
  open: boolean;
  expense: Expense | null;
  month: string;
  categories: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Add / edit form for a single expense. */
function ExpenseDialog({ open, expense, month, categories, onOpenChange, onSaved }: ExpenseDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New expenses default to today when viewing the current month, else the 1st of the viewed month.
  const defaultDate = expense
    ? toDateInput(expense.date)
    : month === currentMonth()
      ? toDateInput(new Date())
      : toDateInput(`${month}-01T00:00:00`);

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
      toast.success(expense ? "Expense updated" : "Expense added");
      // Saving may have pushed a category over budget and created an alert.
      refreshNotifications();
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
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
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
              <Input id="amount" type="number" inputMode="decimal" name="amount" min="0" step="0.01" defaultValue={expense?.amount} placeholder="0" required autoFocus={!expense} />
            </FormField>
            <FormField label="Date" htmlFor="date">
              <Input id="date" type="date" name="date" defaultValue={defaultDate} required />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description">
            <Input id="description" name="description" defaultValue={expense?.description} placeholder="What was it for?" required />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category" htmlFor="category">
              <CategorySelect id="category" name="category" options={categories} defaultValue={expense?.category} />
            </FormField>
            <FormField label="Payment method" htmlFor="paymentMethod">
              <NativeSelect id="paymentMethod" name="paymentMethod" defaultValue={expense?.paymentMethod ?? "Cash"}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <FormField label="Notes (optional)" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={expense?.notes ?? ""} placeholder="Any extra details…" rows={2} />
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
