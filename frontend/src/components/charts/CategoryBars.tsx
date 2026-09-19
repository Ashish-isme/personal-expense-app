import { formatCurrency } from "@/lib/utils";

interface CategoryBarsProps {
  data: { category: string; amount: number }[];
}

/**
 * Spending by category as a ranked list of bars — one hue, since the bars
 * encode amount, not identity. Each row is labelled with its amount and share,
 * so no tooltip or legend is needed.
 */
export function CategoryBars({ data }: CategoryBarsProps) {
  const rows = [...data].sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, d) => s + d.amount, 0);
  const max = rows[0]?.amount || 1;

  return (
    <ul className="space-y-3">
      {rows.map((d) => (
        <li key={d.category} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{d.category}</span>
            <span className="tabular shrink-0">
              <span className="font-medium">{formatCurrency(d.amount)}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {total ? Math.round((d.amount / total) * 100) : 0}%
              </span>
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${(d.amount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
