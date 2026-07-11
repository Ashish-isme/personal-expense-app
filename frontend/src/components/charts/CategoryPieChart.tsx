import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { colorFor, formatCurrency } from "../../lib/utils";

interface CategoryPieChartProps {
  data: { category: string; amount: number }[];
}

/** Donut chart of spending broken down by category. */
export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={62}
          outerRadius={98}
          paddingAngle={2}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={colorFor(i)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${formatCurrency(value)} (${total ? Math.round((value / total) * 100) : 0}%)`,
            name,
          ]}
          contentStyle={tooltipStyle}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => <span className="text-neutral-600 dark:text-neutral-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(120,120,120,0.2)",
  background: "rgba(30,30,30,0.92)",
  color: "#fff",
  fontSize: 12,
  padding: "8px 12px",
} as const;
