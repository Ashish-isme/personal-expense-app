import { cx } from "../../lib/utils";

interface ProgressBarProps {
  /** 0–100+ (values above 100 indicate overspend). */
  percent: number;
}

/** Budget usage bar — green under 75%, amber under 100%, red when over budget. */
export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    percent > 100 ? "bg-red-500" : percent >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
