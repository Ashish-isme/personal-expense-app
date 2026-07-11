import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCompact, formatCurrency } from "../../lib/utils";

interface TrendPoint {
  label: string;
  expense: number;
  income: number;
}

interface TrendChartProps {
  data: TrendPoint[];
}

/** Income vs. expense trend across recent months. */
export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5484d" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#e5484d" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#30a46c" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#30a46c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatCompact(v)} tick={axisTick} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expense"]}
          contentStyle={tooltipStyle}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => (
            <span className="text-neutral-600 dark:text-neutral-300">{value === "income" ? "Income" : "Expense"}</span>
          )}
        />
        <Area type="monotone" dataKey="income" stroke="#30a46c" strokeWidth={2} fill="url(#incomeGrad)" isAnimationActive={false} />
        <Area type="monotone" dataKey="expense" stroke="#e5484d" strokeWidth={2} fill="url(#expenseGrad)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
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
