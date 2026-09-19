import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatAxis, formatCurrency } from "@/lib/utils";

interface TrendPoint {
  label: string;
  expense: number;
  income: number;
}

// Two categorical hues (validated for colour-vision deficiency in light and
// dark). Green/red are kept for status, not for series identity.
const config = {
  income: { label: "Income", theme: { light: "#5b5bd6", dark: "#7b7ee6" } },
  expense: { label: "Expenses", theme: { light: "#d97706", dark: "#c9780e" } },
} satisfies ChartConfig;

/** Income vs. expenses across recent months. */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const last = data.length - 1;
  // Names the series at the end of each line, so identity isn't carried by colour alone.
  const endLabel = (name: string) =>
    function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
      if (props.index !== last) return null;
      return (
        <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} className="fill-muted-foreground text-[11px]">
          {name}
        </text>
      );
    };

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ top: 8, right: 64, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={(v: number) => formatAxis(v)} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
                  <span className="tabular font-medium">{formatCurrency(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {(["income", "expense"] as const).map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          >
            <LabelList content={endLabel(config[key].label)} />
          </Line>
        ))}
      </LineChart>
    </ChartContainer>
  );
}
