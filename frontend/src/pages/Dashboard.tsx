import { useMemo, useState } from "react";
import {
  Wallet,
  Target,
  TrendingDown,
  PiggyBank,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { useFetch } from "../lib/useFetch";
import type { DashboardData, Budget } from "../lib/types";
import { currentMonth, formatCurrency, formatDate, cx, budgetStatus } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState } from "../components/ui/EmptyState";
import { CategoryPieChart } from "../components/charts/CategoryPieChart";
import { TrendChart } from "../components/charts/TrendChart";

export function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error } = useFetch<DashboardData>(`/api/dashboard?month=${month}`);
  const { data: budgets } = useFetch<Budget[]>(`/api/budgets?month=${month}`);

  const overBudget = useMemo(
    () => (budgets ?? []).filter((b) => budgetStatus(b.percentUsed) === "over"),
    [budgets]
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your money at a glance"
        actions={<MonthSwitcher month={month} onChange={setMonth} />}
      />

      {error && <ErrorBanner message={error} />}
      {overBudget.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            Over budget in{" "}
            <span className="font-semibold">{overBudget.map((b) => b.category).join(", ")}</span> this month.
          </span>
        </div>
      )}
      {loading && !data ? (
        <LoadingGrid />
      ) : data ? (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Monthly Income" value={data.summary.monthlyIncome} icon={Wallet} tone="positive" />
            <StatCard label="Monthly Budget" value={data.summary.monthlyBudget} icon={Target} tone="brand" />
            <StatCard label="Total Expenses" value={data.summary.totalExpenses} icon={TrendingDown} tone="negative" />
            <StatCard
              label="Remaining Budget"
              value={data.summary.remainingBudget}
              icon={PiggyBank}
              tone={data.summary.remainingBudget >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Savings"
              value={data.summary.savings}
              icon={Banknote}
              tone={data.summary.savings >= 0 ? "positive" : "negative"}
              hint="Income − Expenses"
            />
            <StatCard label="Money to Receive" value={data.summary.moneyToReceive} icon={ArrowDownLeft} tone="positive" />
            <StatCard label="Money to Pay" value={data.summary.moneyToPay} icon={ArrowUpRight} tone="negative" />
            <StatCard label="Net Worth" value={data.summary.netWorth} icon={Landmark} tone="brand" hint="Lifetime + owed − owing" />
          </div>

          {/* Charts */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Spending by Category</h2>
              <p className="mb-2 text-xs text-neutral-400">This month's expense breakdown</p>
              {data.spendingByCategory.length ? (
                <CategoryPieChart data={data.spendingByCategory} />
              ) : (
                <EmptyState icon={Inbox} title="No spending yet" description="Add expenses to see the breakdown." />
              )}
            </div>

            <div className="card p-5 lg:col-span-3">
              <h2 className="mb-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Monthly Spending Trend</h2>
              <p className="mb-2 text-xs text-neutral-400">Income vs. expenses over the last 6 months</p>
              <TrendChart data={data.monthlyTrend} />
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card mt-4 p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Recent Transactions</h2>
            {data.recentTransactions.length ? (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.recentTransactions.map((t) => (
                  <li key={`${t.type}-${t.id}`} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={cx(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          t.type === "income"
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                        )}
                      >
                        {t.type === "income" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{t.title}</p>
                        <p className="text-xs text-neutral-400">
                          {t.subtitle} · {formatDate(t.date)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cx(
                        "text-sm font-semibold",
                        t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 dark:text-neutral-100"
                      )}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Inbox} title="No transactions yet" description="Your latest activity will appear here." />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card h-24 animate-pulse p-4" />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      {message} — is the backend running?
    </div>
  );
}
