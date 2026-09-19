import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import type { Forecast } from "../lib/types";
import { cx, formatCurrency } from "../lib/utils";

/**
 * Compact outlook for the current month: income, planned spending (budgets),
 * and money owed, adding up to the projected change in your money. Links to
 * the full Forecast page.
 */
export function ForecastOutlook({ className }: { className?: string }) {
  const { data } = useFetch<Forecast>("/api/forecast?months=0");
  const m = data?.months[0];
  if (!m) return null;

  const parts = [
    { label: "Income", value: m.income.total, sign: "+" },
    { label: "Planned spending", value: m.spending.planned, sign: "−" },
    { label: "To receive", value: m.debts.toReceive, sign: "+" },
    { label: "To pay", value: m.debts.toPay, sign: "−" },
  ];

  return (
    <div className={cx("card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <TrendingUp size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{m.label} outlook</p>
            <p className="text-xs text-neutral-400">Budgets, recurring bills and money owed, together</p>
          </div>
        </div>
        <Link to="/forecast" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand hover:underline">
          Forecast <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-5">
        {parts.map((p) => (
          <div key={p.label}>
            <p className="text-xs text-neutral-400">{p.label}</p>
            <p className="font-medium text-neutral-700 dark:text-neutral-200">
              {p.sign} {formatCurrency(p.value)}
            </p>
          </div>
        ))}
        <div className="col-span-2 border-t border-neutral-100 pt-1 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 dark:border-neutral-800">
          <p className="text-xs text-neutral-400">Month result</p>
          <p className={cx("font-semibold", m.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {m.net >= 0 ? "+" : "−"} {formatCurrency(Math.abs(m.net))}
          </p>
        </div>
      </div>
    </div>
  );
}
