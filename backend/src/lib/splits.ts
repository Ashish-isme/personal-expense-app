// Split calculation for shared group expenses.
//
// All arithmetic is done in integer cents. Floats can't represent most decimal
// amounts exactly, so splitting 100 three ways in floats gives 33.33 * 3 =
// 99.99 and a cent quietly vanishes. Working in cents and handing out the
// remainder explicitly guarantees the shares always sum to the exact total.

export type SplitMode = "equal" | "custom" | "percent";

export interface SplitParticipant {
  userId: string;
  /** Exact share for "custom", percentage (0–100) for "percent". Unused for "equal". */
  value?: number;
}

export interface ComputedSplit {
  userId: string;
  amount: number;
}

const toCents = (n: number) => Math.round(n * 100);
const toAmount = (cents: number) => cents / 100;

function badRequest(message: string): Error & { status?: number } {
  const err = new Error(message) as Error & { status?: number };
  err.status = 400;
  return err;
}

/**
 * Splits `total` across `participants` according to `mode`.
 * The returned amounts are guaranteed to sum to exactly `total`.
 */
export function computeSplits(
  total: number,
  mode: SplitMode,
  participants: SplitParticipant[]
): ComputedSplit[] {
  if (participants.length === 0) throw badRequest("At least one participant is required");

  const ids = participants.map((p) => p.userId);
  if (new Set(ids).size !== ids.length) throw badRequest("A participant is listed more than once");

  const totalCents = toCents(total);
  if (totalCents <= 0) throw badRequest("Amount must be greater than 0");

  if (mode === "equal") return splitEqual(totalCents, participants);
  if (mode === "custom") return splitCustom(totalCents, participants);
  if (mode === "percent") return splitPercent(totalCents, participants);
  throw badRequest(`Unknown split mode: ${mode}`);
}

/** Equal shares; the leftover cents go one each to the earliest participants. */
function splitEqual(totalCents: number, participants: SplitParticipant[]): ComputedSplit[] {
  const n = participants.length;
  const base = Math.floor(totalCents / n);
  let remainder = totalCents - base * n;

  return participants.map((p) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { userId: p.userId, amount: toAmount(base + extra) };
  });
}

/** Exact per-person amounts. They must add up to the total. */
function splitCustom(totalCents: number, participants: SplitParticipant[]): ComputedSplit[] {
  const cents = participants.map((p) => {
    if (p.value == null || isNaN(p.value)) throw badRequest("Every participant needs an amount");
    if (p.value < 0) throw badRequest("Amounts can't be negative");
    return toCents(p.value);
  });

  const sum = cents.reduce((a, b) => a + b, 0);
  if (sum !== totalCents) {
    throw badRequest(
      `Shares add up to ${toAmount(sum)}, but the expense total is ${toAmount(totalCents)}`
    );
  }

  return participants.map((p, i) => ({ userId: p.userId, amount: toAmount(cents[i]) }));
}

/**
 * Percentage shares. Percentages must sum to 100. Cents are allocated with the
 * largest-remainder method so rounding drift lands on whoever was rounded down
 * hardest, rather than silently dropping or inventing a cent.
 */
function splitPercent(totalCents: number, participants: SplitParticipant[]): ComputedSplit[] {
  const percents = participants.map((p) => {
    if (p.value == null || isNaN(p.value)) throw badRequest("Every participant needs a percentage");
    if (p.value < 0) throw badRequest("Percentages can't be negative");
    return p.value;
  });

  const sum = percents.reduce((a, b) => a + b, 0);
  // Tolerate float noise from the client (e.g. 33.33 + 33.33 + 33.34).
  if (Math.abs(sum - 100) > 0.01) {
    throw badRequest(`Percentages add up to ${Number(sum.toFixed(2))}%, but must total 100%`);
  }

  const exact = percents.map((pct) => (pct / 100) * totalCents);
  const floors = exact.map((c) => Math.floor(c));
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);

  // Hand the leftover cents to the largest fractional parts first.
  const order = exact
    .map((c, i) => ({ i, frac: c - Math.floor(c) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] += 1;
    remainder -= 1;
  }

  return participants.map((p, i) => ({ userId: p.userId, amount: toAmount(result[i]) }));
}
