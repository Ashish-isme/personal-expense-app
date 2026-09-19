// Month-by-month cash forecast.
//
// For each month from the current one forward, it combines:
//   • income already received, plus recurring income still to come;
//   • planned spending: per category, the larger of its budget and what's
//     already spent plus recurring bills still due (so going over a budget
//     raises the plan, and staying under it assumes the budget gets used);
//   • money owed, by due date: to receive (owed to you) and to pay (you owe).
//     Pending entries already overdue are counted in the current month.
// Balances roll forward: each month closes at opening + net, and that becomes
// the next month's opening. The first opening balance is all income minus all
// expenses recorded before the current month.

import { prisma } from "./prisma.js";
import { advanceDate, monthRange, toMonthKey } from "./dates.js";
import { effectiveBudgets } from "./budgets.js";

export interface CategoryForecast {
  category: string;
  budget: number;
  spent: number;
  /** Recurring bills in this category still to come this month. */
  upcoming: number;
  /** What the forecast assumes this category will cost this month. */
  planned: number;
}

export interface MonthForecast {
  month: string;
  label: string;
  openingBalance: number;
  income: { received: number; expected: number; total: number };
  spending: { spent: number; remaining: number; planned: number; budget: number };
  debts: { toReceive: number; toPay: number };
  net: number;
  closingBalance: number;
  categories: CategoryForecast[];
}

export interface Forecast {
  months: MonthForecast[];
  /** Pending money owed with no due date — not placed in any month. */
  unscheduled: { toReceive: number; toPay: number };
}

type Rule = Awaited<ReturnType<typeof prisma.recurring.findMany>>[number];

/** Dates of a rule's not-yet-generated occurrences that fall in [start, end). */
function occurrencesIn(rule: Rule, start: Date, end: Date): Date[] {
  const freq = rule.frequency === "weekly" ? "weekly" : "monthly";
  const anchorDay = rule.startDate.getUTCDate();
  const dates: Date[] = [];
  let cursor = rule.nextRun;
  for (let guard = 0; cursor < end && guard < 500; guard++) {
    if (rule.endDate && cursor > rule.endDate) break;
    if (cursor >= start) dates.push(cursor);
    cursor = advanceDate(cursor, freq, anchorDay);
  }
  return dates;
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

export async function buildForecast(userId: string, monthsAhead: number): Promise<Forecast> {
  const firstMonth = toMonthKey(new Date());
  const { start: firstStart } = monthRange(firstMonth);

  const [incomeBefore, expenseBefore, rules, debts] = await Promise.all([
    prisma.income.aggregate({ _sum: { amount: true }, where: { userId, date: { lt: firstStart } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { userId, date: { lt: firstStart } } }),
    prisma.recurring.findMany({ where: { userId, active: true } }),
    prisma.debt.findMany({ where: { userId, status: "pending" } }),
  ]);

  let opening = (incomeBefore._sum.amount ?? 0) - (expenseBefore._sum.amount ?? 0);
  const months: MonthForecast[] = [];

  for (let i = 0; i <= monthsAhead; i++) {
    const [y, m] = firstMonth.split("-").map(Number);
    const month = toMonthKey(new Date(y, m - 1 + i, 1));
    const { start, end } = monthRange(month);

    const [incomeAgg, spentGroups, budgets] = await Promise.all([
      prisma.income.aggregate({ _sum: { amount: true }, where: { userId, date: { gte: start, lt: end } } }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      effectiveBudgets(userId, month),
    ]);

    // Income
    const received = incomeAgg._sum.amount ?? 0;
    const expected = sum(
      rules.filter((r) => r.type === "income").map((r) => occurrencesIn(r, start, end).length * r.amount)
    );

    // Spending, per category
    const spent = new Map(spentGroups.map((g) => [g.category, g._sum.amount ?? 0]));
    const upcoming = new Map<string, number>();
    for (const r of rules.filter((r) => r.type === "expense")) {
      const due = occurrencesIn(r, start, end).length * r.amount;
      if (due) upcoming.set(r.category, (upcoming.get(r.category) ?? 0) + due);
    }
    const budgetFor = new Map(budgets.map((b) => [b.category, b.amount]));
    const names = new Set([...budgetFor.keys(), ...spent.keys(), ...upcoming.keys()]);
    const categories = [...names]
      .map((category) => {
        const budget = budgetFor.get(category) ?? 0;
        const s = spent.get(category) ?? 0;
        const u = upcoming.get(category) ?? 0;
        return { category, budget, spent: s, upcoming: u, planned: Math.max(budget, s + u) };
      })
      .sort((a, b) => b.planned - a.planned);

    const spentTotal = sum(categories.map((c) => c.spent));
    const planned = sum(categories.map((c) => c.planned));

    // Money owed due this month (the first month also picks up anything overdue).
    const dueNow = (d: (typeof debts)[number]) =>
      d.dueDate !== null && d.dueDate < end && (i === 0 || d.dueDate >= start);
    const toReceive = sum(debts.filter((d) => d.direction === "owed_to_me" && dueNow(d)).map((d) => d.amount));
    const toPay = sum(debts.filter((d) => d.direction === "i_owe" && dueNow(d)).map((d) => d.amount));

    const net = received + expected - planned + toReceive - toPay;
    months.push({
      month,
      label: new Date(start).toLocaleString("en-US", { month: "long", year: "numeric" }),
      openingBalance: opening,
      income: { received, expected, total: received + expected },
      spending: { spent: spentTotal, remaining: planned - spentTotal, planned, budget: sum(budgets.map((b) => b.amount)) },
      debts: { toReceive, toPay },
      net,
      closingBalance: opening + net,
      categories,
    });
    opening += net;
  }

  const undated = debts.filter((d) => d.dueDate === null);
  return {
    months,
    unscheduled: {
      toReceive: sum(undated.filter((d) => d.direction === "owed_to_me").map((d) => d.amount)),
      toPay: sum(undated.filter((d) => d.direction === "i_owe").map((d) => d.amount)),
    },
  };
}
