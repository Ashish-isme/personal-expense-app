import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

type Tone = "default" | "positive" | "negative";

interface StatCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  /** Colours the figure: green for money in, red for money out or shortfalls. */
  tone?: Tone;
  hint?: string;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  negative: "text-destructive",
};

/** A single headline figure. */
export function StatCard({ label, value, icon: Icon, tone = "default", hint, className }: StatCardProps) {
  return (
    <Card className={cn("gap-2 p-4 shadow-none", className)}>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs font-medium">
        <span className="truncate">{label}</span>
        {Icon && <Icon className="size-4 shrink-0 opacity-70" />}
      </div>
      <AnimatedNumber
        value={value}
        format={(n) => formatCurrency(Math.round(n))}
        className={cn("tabular text-xl font-semibold tracking-tight sm:text-2xl", toneClass[tone])}
      />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </Card>
  );
}
