import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Banknote, FileSpreadsheet, FileText, Inbox, TrendingDown, Wallet } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { downloadUrl } from "@/lib/api";
import type { ReportData } from "@/lib/types";
import { currentMonth, formatAxis, formatCurrency, monthTitle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { CategoryBars } from "@/components/charts/CategoryBars";

type ReportType = "monthly" | "yearly" | "category";

// Same validated series hues as the dashboard trend chart.
const monthlyConfig = {
  income: { label: "Income", theme: { light: "#5b5bd6", dark: "#7b7ee6" } },
  expense: { label: "Expenses", theme: { light: "#d97706", dark: "#c9780e" } },
} satisfies ChartConfig;

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

  const exportHref = (fmt: "csv" | "xlsx") => downloadUrl(`/api/reports/export.${fmt}?type=${type}&period=${period}`);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Analyze your finances and export the data"
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={exportHref("csv")} download>
                <FileText /> CSV
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportHref("xlsx")} download>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={type} onValueChange={(v) => changeType(v as ReportType)}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
            <TabsTrigger value="category">Category</TabsTrigger>
          </TabsList>
        </Tabs>
        {type === "monthly" ? (
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:w-44" aria-label="Month" />
        ) : (
          <Input
            type="number"
            min="2000"
            max="2100"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="sm:w-28"
            aria-label="Year"
          />
        )}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Income" value={data.totals.income} icon={Wallet} tone="positive" />
            <StatCard label="Expenses" value={data.totals.expense} icon={TrendingDown} />
            <StatCard label="Net" value={data.totals.net} icon={Banknote} tone={data.totals.net >= 0 ? "positive" : "negative"} />
          </section>

          <section className={type === "yearly" ? "grid grid-cols-1 gap-4 lg:grid-cols-5" : undefined}>
            {type === "yearly" && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Month by month</CardTitle>
                  <CardDescription>Income and expenses in {period}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.monthly.length ? (
                    <ChartContainer config={monthlyConfig} className="aspect-auto h-72 w-full">
                      <BarChart data={data.monthly} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeOpacity={0.5} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickFormatter={(v: number) => formatAxis(v)} tickLine={false} axisLine={false} width={40} />
                        <ChartTooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                  <span className="text-muted-foreground">
                                    {monthlyConfig[name as keyof typeof monthlyConfig]?.label ?? name}
                                  </span>
                                  <span className="tabular font-medium">{formatCurrency(Number(value))}</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState icon={Inbox} title="No data for this year" />
                  )}
                </CardContent>
              </Card>
            )}

            <Card className={type === "yearly" ? "lg:col-span-2" : undefined}>
              <CardHeader>
                <CardTitle>Spending by category</CardTitle>
                <CardDescription>{type === "monthly" ? monthTitle(period) : `All of ${period}`}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byCategory.length ? (
                  <CategoryBars data={data.byCategory} />
                ) : (
                  <EmptyState icon={Inbox} title="No spending in this period" />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </>
  );
}
