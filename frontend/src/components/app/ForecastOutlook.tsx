import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import type { Forecast } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className={cn("gap-4 p-4 shadow-none", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{m.label} outlook</p>
            <p className="text-muted-foreground text-xs">Budgets, recurring bills and money owed, together</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link to="/forecast">
            Forecast <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <p className="text-muted-foreground truncate text-xs">{p.label}</p>
            <p className="tabular text-sm font-medium">
              {p.sign} {formatCurrency(p.value)}
            </p>
          </div>
        ))}
        <div className="col-span-2 border-t pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <p className="text-muted-foreground text-xs">Month result</p>
          <p className={cn("tabular text-sm font-semibold", m.net >= 0 ? "text-positive" : "text-destructive")}>
            {m.net >= 0 ? "+" : "−"} {formatCurrency(Math.abs(m.net))}
          </p>
        </div>
      </div>
    </Card>
  );
}
