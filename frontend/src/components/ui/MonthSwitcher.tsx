import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthTitle, shiftMonth } from "../../lib/utils";

interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

/** Prev / current / next month control used on several pages. */
export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Previous month"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[120px] text-center text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {monthTitle(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Next month"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
