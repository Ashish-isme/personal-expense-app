import { TrendingUp, Landmark, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import type { Forecast as ForecastData, MonthForecast } from "../lib/types";
import { cx, formatCurrency } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";

const MONTHS_AHEAD = 3;

export function Forecast() {
  const { data, loading, error } = useFetch<ForecastData>(`/api/forecast?months=${MONTHS_AHEAD}`);

  const current = data?.months[0];
  const last = data?.months[data.months.length - 1];

  return (
    <div>
      <PageHeader
        title="Forecast"
        subtitle="Where your money is heading, from your budgets, recurring income and bills, and money owed"
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading && !data ? (
        <div className="card p-6 text-sm text-neutral-400">Loading…</div>
      ) : data && current && last ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={`End of ${current.label}`}
              value={current.closingBalance}
              icon={TrendingUp}
              tone={current.closingBalance >= 0 ? "brand" : "negative"}
              hint="Projected balance"
            />
            <StatCard
              label={`End of ${last.label}`}
              value={last.closingBalance}
              icon={Landmark}
              tone={last.closingBalance >= 0 ? "brand" : "negative"}
              hint={`${MONTHS_AHEAD} months out`}
            />
            <StatCard
              label="To receive, no due date"
              value={data.unscheduled.toReceive}
              icon={ArrowDownLeft}
              tone="positive"
              hint="Not placed in any month"
            />
            <StatCard
              label="To pay, no due date"
              value={data.unscheduled.toPay}
              icon={ArrowUpRight}
              tone="negative"
              hint="Not placed in any month"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.months.map((m, i) => (
              <MonthCard key={m.month} month={m} current={i === 0} />
            ))}
          </div>

          <CategoryTable month={current} />

          <p className="mt-4 text-xs text-neutral-400">
            How this is worked out: each category is planned at its budget, or at what you've already spent plus
            recurring bills still due if that's more. Income is what you've received plus recurring income still to
            come. Money owed counts in the month it's due; anything overdue counts this month. The starting balance is
            all income minus all expenses recorded before this month.
          </p>
        </>
      ) : null}
    </div>
  );
}

/** A line of the month breakdown. `muted` rows are indented sub-lines of the row above. */
function Row({ label, value, sign, muted }: { label: string; value: number; sign: "+" | "−"; muted?: boolean }) {
  return (
    <div
      className={cx("flex justify-between text-sm", muted ? "pl-3 text-neutral-400" : "text-neutral-600 dark:text-neutral-300")}
    >
      <span>{label}</span>
      <span>
        {sign} {formatCurrency(value)}
      </span>
    </div>
  );
}

function MonthCard({ month: m, current }: { month: MonthForecast; current: boolean }) {
  return (
    <div className={cx("card p-4", current && "ring-1 ring-brand/40")}>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{m.label}</p>
        {current && <span className="text-xs text-brand">This month</span>}
      </div>

      <div className="flex justify-between text-sm text-neutral-400">
        <span>Starting balance</span>
        <span>{formatCurrency(m.openingBalance)}</span>
      </div>

      <div className="my-2 space-y-1 border-y border-neutral-100 py-2 dark:border-neutral-800">
        <Row label="Income" value={m.income.total} sign="+" />
        {current && m.income.expected > 0 && (
          <Row label="still to come" value={m.income.expected} sign="+" muted />
        )}
        <Row label="Planned spending" value={m.spending.planned} sign="−" />
        {current && <Row label="still to spend" value={m.spending.remaining} sign="−" muted />}
        <Row label="Money to receive" value={m.debts.toReceive} sign="+" />
        <Row label="Money to pay" value={m.debts.toPay} sign="−" />
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">Month result</span>
        <span className={cx("font-medium", m.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
          {m.net >= 0 ? "+" : "−"} {formatCurrency(Math.abs(m.net))}
        </span>
      </div>
      <div className="mt-1 flex justify-between">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">End balance</span>
        <span
          className={cx(
            "text-base font-semibold",
            m.closingBalance >= 0 ? "text-neutral-800 dark:text-neutral-100" : "text-red-600 dark:text-red-400"
          )}
        >
          {formatCurrency(m.closingBalance)}
        </span>
      </div>
    </div>
  );
}

function CategoryTable({ month }: { month: MonthForecast }) {
  if (!month.categories.length) return null;
  return (
    <div className="card mt-4 overflow-x-auto p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{month.label} by category</h2>
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-400">
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 text-right font-medium">Budget</th>
            <th className="pb-2 text-right font-medium">Spent</th>
            <th className="pb-2 text-right font-medium">Bills due</th>
            <th className="pb-2 text-right font-medium">Planned</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {month.categories.map((c) => (
            <tr key={c.category} className="text-neutral-600 dark:text-neutral-300">
              <td className="py-1.5">{c.category}</td>
              <td className="py-1.5 text-right">{c.budget ? formatCurrency(c.budget) : "—"}</td>
              <td className={cx("py-1.5 text-right", c.budget > 0 && c.spent > c.budget && "text-red-600 dark:text-red-400")}>
                {formatCurrency(c.spent)}
              </td>
              <td className="py-1.5 text-right">{c.upcoming ? formatCurrency(c.upcoming) : "—"}</td>
              <td className="py-1.5 text-right font-medium">{formatCurrency(c.planned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
