import { TrendingUp, Landmark, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import type { Forecast as ForecastData, MonthForecast } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { FormError } from "@/components/app/FormField";

const MONTHS_AHEAD = 3;

export function Forecast() {
  const { data, loading, error } = useFetch<ForecastData>(`/api/forecast?months=${MONTHS_AHEAD}`);

  const current = data?.months[0];
  const last = data?.months[data.months.length - 1];

  return (
    <>
      <PageHeader
        title="Forecast"
        description="Where your money is heading, from your budgets, recurring income and bills, and money owed"
      />

      <FormError message={error} />

      {loading && !data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </>
      ) : data && current && last ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={`End of ${current.label.slice(0, 3)}`}
              value={current.closingBalance}
              icon={TrendingUp}
              tone={current.closingBalance >= 0 ? "default" : "negative"}
              hint={`Projected, ${current.label}`}
            />
            <StatCard
              label={`End of ${last.label.slice(0, 3)}`}
              value={last.closingBalance}
              icon={Landmark}
              tone={last.closingBalance >= 0 ? "default" : "negative"}
              hint={`${MONTHS_AHEAD} months out, ${last.label}`}
            />
            <StatCard
              label="To receive"
              value={data.unscheduled.toReceive}
              icon={ArrowDownLeft}
              tone="positive"
              hint="No due date set"
            />
            <StatCard
              label="To pay"
              value={data.unscheduled.toPay}
              icon={ArrowUpRight}
              tone="negative"
              hint="No due date set"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.months.map((m, i) => (
              <MonthCard key={m.month} month={m} current={i === 0} />
            ))}
          </div>

          <CategoryTable month={current} />

          <p className="text-muted-foreground text-xs leading-relaxed">
            How this is worked out: each category is planned at its budget, or at what you've already spent plus
            recurring bills still due if that's more. Income is what you've received plus recurring income still to
            come. Money owed counts in the month it's due; anything overdue counts this month. The starting balance is
            all income minus all expenses recorded before this month.
          </p>
        </>
      ) : null}
    </>
  );
}

/** A line of the month breakdown. `muted` rows are indented sub-lines of the row above. */
function Row({ label, value, sign, muted }: { label: string; value: number; sign: "+" | "−"; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2 text-sm", muted && "text-muted-foreground pl-3 text-xs")}>
      <span>{label}</span>
      <span className="tabular">
        {sign} {formatCurrency(value)}
      </span>
    </div>
  );
}

function MonthCard({ month: m, current }: { month: MonthForecast; current: boolean }) {
  return (
    <Card className={cn("gap-3 p-4 shadow-none", current && "border-primary/40 ring-primary/15 ring-2")}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{m.label}</p>
        {current && <Badge variant="secondary">This month</Badge>}
      </div>

      <div className="text-muted-foreground flex justify-between text-sm">
        <span>Starting balance</span>
        <span className="tabular">{formatCurrency(m.openingBalance)}</span>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Row label="Income" value={m.income.total} sign="+" />
        {current && m.income.expected > 0 && <Row label="still to come" value={m.income.expected} sign="+" muted />}
        <Row label="Planned spending" value={m.spending.planned} sign="−" />
        {current && <Row label="still to spend" value={m.spending.remaining} sign="−" muted />}
        <Row label="Money to receive" value={m.debts.toReceive} sign="+" />
        <Row label="Money to pay" value={m.debts.toPay} sign="−" />
      </div>

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Month result</span>
          <span className={cn("tabular font-medium", m.net >= 0 ? "text-positive" : "text-destructive")}>
            {m.net >= 0 ? "+" : "−"} {formatCurrency(Math.abs(m.net))}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">End balance</span>
          <span className={cn("tabular text-lg font-semibold", m.closingBalance < 0 && "text-destructive")}>
            {formatCurrency(m.closingBalance)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function CategoryTable({ month }: { month: MonthForecast }) {
  if (!month.categories.length) return null;
  return (
    <Card className="gap-0 overflow-hidden pb-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{month.label} by category</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Category</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Bills due</TableHead>
              <TableHead className="pr-6 text-right">Planned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {month.categories.map((c) => (
              <TableRow key={c.category}>
                <TableCell className="pl-6 font-medium">{c.category}</TableCell>
                <TableCell className="text-muted-foreground tabular text-right">
                  {c.budget ? formatCurrency(c.budget) : "—"}
                </TableCell>
                <TableCell
                  className={cn("tabular text-right", c.budget > 0 && c.spent > c.budget && "text-destructive")}
                >
                  {formatCurrency(c.spent)}
                </TableCell>
                <TableCell className="text-muted-foreground tabular hidden text-right sm:table-cell">
                  {c.upcoming ? formatCurrency(c.upcoming) : "—"}
                </TableCell>
                <TableCell className="tabular pr-6 text-right font-medium">{formatCurrency(c.planned)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
