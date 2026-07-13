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

/**
 * Advances a date by one recurrence interval.
 *
 * All arithmetic is done in UTC because recurrence dates are stored as UTC
 * midnight — using local getters would shift the day in any timezone offset
 * from UTC, making the day-of-month drift on every occurrence.
 *
 * `anchorDay` is the day-of-month the rule was created with. Monthly recurrences
 * clamp to the last valid day of short months (Jan 31 → Feb 28) but return to the
 * anchor afterwards (→ Mar 31), rather than ratcheting down permanently.
 */
export function advanceDate(date: Date, frequency: "weekly" | "monthly", anchorDay?: number): Date {
  if (frequency === "weekly") {
    return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = anchorDay ?? date.getUTCDate();
  // Day 0 of the month after the target month = last day of the target month.
  const lastDayOfTarget = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(day, lastDayOfTarget)));
}

/** Short month label, e.g. "Jul 26". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} ${String(y).slice(2)}`;
}
