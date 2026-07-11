import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { downloadUrl } from "../lib/api";
import type { ReportData } from "../lib/types";
import { currentMonth, formatCurrency, formatCompact, colorFor, cx } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState } from "../components/ui/EmptyState";
import { Wallet, TrendingDown, Banknote, Inbox } from "lucide-react";

type ReportType = "monthly" | "yearly" | "category";

export function Reports() {
  const [type, setType] = useState<ReportType>("monthly");
  // period is YYYY-MM for monthly, YYYY for yearly/category
  const [period, setPeriod] = useState<string>(currentMonth());

  const { data, loading } = useFetch<ReportData>(`/api/reports?type=${type}&period=${period}`);

  const changeType = (next: ReportType) => {
    setType(next);
    // Reset period format to match the new report type.
    setPeriod(next === "monthly" ? currentMonth() : String(new Date().getFullYear()));
  };

  const exportHref = (fmt: "csv" | "xlsx") =>
    downloadUrl(`/api/reports/export.${fmt}?type=${type}&period=${period}`);

  const tabs: { key: ReportType; label: string }[] = [
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" },
    { key: "category", label: "Category" },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Analyze your finances and export the data"
        actions={
          <>
            <a href={exportHref("csv")} download>
              <Button variant="secondary">
                <FileText size={16} /> CSV
              </Button>
            </a>
            <a href={exportHref("xlsx")} download>
              <Button variant="secondary">
                <FileSpreadsheet size={16} /> Excel
              </Button>
            </a>
          </>
        }
      />

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => changeType(t.key)}
              className={cx(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                type === t.key
                  ? "bg-brand text-white"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {type === "monthly" ? (
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="field w-auto"
          />
        ) : (
          <input
            type="number"
            min="2000"
            max="2100"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="field w-28"
          />
        )}
      </div>

      {loading && !data ? (
        <div className="card p-6 text-sm text-neutral-400">Loading…</div>
      ) : data ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total Income" value={data.totals.income} icon={Wallet} tone="positive" />
            <StatCard label="Total Expenses" value={data.totals.expense} icon={TrendingDown} tone="negative" />
            <StatCard
              label="Net"
              value={data.totals.net}
              icon={Banknote}
              tone={data.totals.net >= 0 ? "positive" : "negative"}
            />
          </div>

          {/* Monthly breakdown (yearly report) or category breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="card p-5 lg:col-span-3">
              <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {type === "yearly" ? "Monthly Breakdown" : "Spending by Category"}
              </h2>
              {type === "yearly" ? (
                data.monthly.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
                      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => formatCompact(v)} tick={axisTick} axisLine={false} tickLine={false} width={56} />
                      <Tooltip
                        formatter={(v: number, n: string) => [formatCurrency(v), n === "income" ? "Income" : "Expense"]}
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "rgba(120,120,120,0.08)" }}
                      />
                      <Bar dataKey="income" fill="#30a46c" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="expense" fill="#e5484d" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={Inbox} title="No data for this year" />
                )
              ) : data.byCategory.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={axisTick} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), "Spent"]}
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "rgba(120,120,120,0.08)" }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {data.byCategory.map((entry, i) => (
                        <Cell key={entry.category} fill={colorFor(i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={Inbox} title="No spending in this period" />
              )}
            </div>

            {/* Category table */}
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Category Totals</h2>
              {data.byCategory.length ? (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {data.byCategory.map((c, i) => (
                    <li key={c.category} className="flex items-center justify-between py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(i) }} />
                        <span className="text-neutral-700 dark:text-neutral-200">{c.category}</span>
                      </span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">{formatCurrency(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Inbox} title="No categories" />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
            <Download size={14} /> Use the CSV or Excel buttons above to export this report.
          </div>
        </>
      ) : null}
    </div>
  );
}

const axisTick = { fontSize: 11, fill: "currentColor" } as const;
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(120,120,120,0.2)",
  background: "rgba(30,30,30,0.92)",
  color: "#fff",
  fontSize: 12,
  padding: "8px 12px",
} as const;
