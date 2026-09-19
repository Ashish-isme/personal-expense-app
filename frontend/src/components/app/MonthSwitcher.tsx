import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthTitle, shiftMonth } from "@/lib/utils";

interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

/** Prev / current / next month control used on several pages. */
export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  return (
    <div className="bg-background flex h-9 items-center rounded-md border shadow-xs dark:bg-input/30">
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center text-sm font-medium">{monthTitle(month)}</span>
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight />
      </Button>
    </div>
  );
}
