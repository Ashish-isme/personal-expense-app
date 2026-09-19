import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Inbox,
  Landmark,
  PiggyBank,
  Target,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import type { DashboardData, Budget } from "@/lib/types";
import { cn, currentMonth, formatCurrency, formatDate, budgetStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/PageHeader";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { ForecastOutlook } from "@/components/app/ForecastOutlook";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { TrendChart } from "@/components/charts/TrendChart";

export function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error } = useFetch<DashboardData>(`/api/dashboard?month=${month}`);
  const { data: budgets } = useFetch<Budget[]>(`/api/budgets?month=${month}`);

  const overBudget = useMemo(
    () => (budgets ?? []).filter((b) => budgetStatus(b.percentUsed) === "over"),
    [budgets]
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your money at a glance"
        actions={<MonthSwitcher month={month} onChange={setMonth} />}
      />

      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {overBudget.length > 0 && (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
          <p className="flex-1">
            Over budget in <span className="font-medium">{overBudget.map((b) => b.category).join(", ")}</span>.
          </p>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link to="/budget">Review</Link>
          </Button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Income" value={data.summary.monthlyIncome} icon={Wallet} tone="positive" />
            <StatCard label="Spent" value={data.summary.totalExpenses} icon={TrendingDown} />
            <StatCard
              label="Budget left"
              value={data.summary.remainingBudget}
              icon={PiggyBank}
              tone={data.summary.remainingBudget >= 0 ? "default" : "negative"}
              hint={`of ${formatCurrency(data.summary.monthlyBudget)}`}
            />
            <StatCard
              label="Saved"
              value={data.summary.savings}
              icon={Banknote}
              tone={data.summary.savings >= 0 ? "positive" : "negative"}
              hint="Income − spent"
            />
            <StatCard label="To receive" value={data.summary.moneyToReceive} icon={ArrowDownLeft} />
            <StatCard label="To pay" value={data.summary.moneyToPay} icon={ArrowUpRight} />
            <StatCard label="Monthly budget" value={data.summary.monthlyBudget} icon={Target} />
            <StatCard label="Net worth" value={data.summary.netWorth} icon={Landmark} hint="All-time, incl. money owed" />
          </section>

          {month === currentMonth() && <ForecastOutlook />}

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Income vs. expenses</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart data={data.monthlyTrend} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Spending by category</CardTitle>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent>
                {data.spendingByCategory.length ? (
                  <CategoryBars data={data.spendingByCategory} />
                ) : (
                  <EmptyState icon={Inbox} title="No spending yet" description="Add expenses to see the breakdown." />
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription>Latest income and expenses</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/expenses">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data.recentTransactions.length ? (
                <ul className="-my-2 divide-y">
                  {data.recentTransactions.map((t) => (
                    <li key={`${t.type}-${t.id}`} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                          {t.type === "income" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{t.title}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {t.subtitle} · {formatDate(t.date)}
                          </p>
                        </div>
                      </div>
                      <span className={cn("tabular shrink-0 text-sm font-medium", t.type === "income" && "text-positive")}>
                        {t.type === "income" ? "+" : "−"}
                        {formatCurrency(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Inbox} title="No transactions yet" description="Your latest activity will appear here." />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  );
}
