/** Returns the [start, end) Date range for a `YYYY-MM` month string. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

/** Returns the [start, end) Date range for a full year (number). */
export function yearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
}

/** Formats a Date as `YYYY-MM`. */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Short month label, e.g. "Jul 26". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} ${String(y).slice(2)}`;
}
