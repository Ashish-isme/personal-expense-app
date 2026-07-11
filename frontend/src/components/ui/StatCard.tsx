import type { LucideIcon } from "lucide-react";
import { cx, formatCurrency } from "../../lib/utils";

type Tone = "neutral" | "positive" | "negative" | "brand";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
}

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  neutral: { icon: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300", value: "text-neutral-800 dark:text-neutral-100" },
  brand: { icon: "bg-brand/10 text-brand", value: "text-neutral-800 dark:text-neutral-100" },
  positive: { icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", value: "text-emerald-600 dark:text-emerald-400" },
  negative: { icon: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400", value: "text-red-600 dark:text-red-400" },
};

/** A single dashboard metric tile. */
export function StatCard({ label, value, icon: Icon, tone = "neutral", hint }: StatCardProps) {
  const styles = toneStyles[tone];
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", styles.icon)}>
          <Icon size={16} />
        </span>
      </div>
      <div className={cx("mt-3 text-xl font-semibold tracking-tight", styles.value)}>
        {formatCurrency(value)}
      </div>
      {hint && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>}
    </div>
  );
}
