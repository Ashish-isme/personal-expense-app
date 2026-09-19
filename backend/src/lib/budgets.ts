// Categories, standing monthly goals, and budget alerts.
//
// A category's `monthlyGoal` applies to every month. A Budget row for a given
// month overrides it for that month only. The "effective" budget for a month is
// the override when there is one, otherwise the goal.

import { prisma } from "./prisma.js";
import { monthRange, toMonthKey } from "./dates.js";
import { money } from "./notify.js";

/** Categories every new account starts with. */
export const STARTER_CATEGORIES = [
  "Groceries",
  "Rent",
  "Transport",
  "Dining",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Travel",
  "Subscriptions",
  "Other",
];

/** Common categories offered as one-tap suggestions when they aren't already in the list. */
const SUGGESTED_CATEGORIES = [
  "Food",
  "Groceries",
  "Dining",
  "Rent",
  "Utilities",
  "Phone & Internet",
  "Transport",
  "Vehicle",
  "Fuel",
  "Vehicle Maintenance",
  "Health",
  "Insurance",
  "Education",
  "Shopping",
  "Clothing",
  "Personal Care",
  "Entertainment",
  "Subscriptions",
  "Travel",
  "Gifts & Donations",
  "Household",
  "Kids",
  "Pets",
  "Other",
];

/** Percentage at which a "nearing your limit" alert fires. Matches the frontend badge. */
const WARN_PERCENT = 80;

/** Pseudo-category used for the alert on total spending across all budgets. */
const TOTAL_KEY = "__total__";

/**
 * Gives an account its category list the first time it's needed: the starter
 * set plus every category the user has already used. Each category's standing
 * goal is taken from its most recent monthly budget, so existing users keep the
 * limits they had been setting by hand.
 */
export async function ensureCategories(userId: string): Promise<void> {
  if ((await prisma.category.count({ where: { userId } })) > 0) return;

  const [expenseCats, recurringCats, budgets] = await Promise.all([
    prisma.expense.findMany({ where: { userId }, select: { category: true }, distinct: ["category"] }),
    prisma.recurring.findMany({ where: { userId, type: "expense" }, select: { category: true }, distinct: ["category"] }),
    prisma.budget.findMany({ where: { userId }, orderBy: { month: "desc" } }),
  ]);

  // Each category's most recent budget becomes its standing goal.
  const latest = new Map<string, { id: string; amount: number }>();
  for (const b of budgets) if (!latest.has(b.category)) latest.set(b.category, { id: b.id, amount: b.amount });
  const latestGoal = new Map([...latest].map(([name, b]) => [name, b.amount]));

  const names = new Set([
    ...STARTER_CATEGORIES,
    ...expenseCats.map((e) => e.category),
    ...recurringCats.map((r) => r.category),
    ...latestGoal.keys(),
  ]);

  await prisma.$transaction([
    prisma.category.createMany({
      data: [...names].map((name) => ({ userId, name, monthlyGoal: latestGoal.get(name) ?? null })),
      skipDuplicates: true,
    }),
    // Those budget rows now duplicate the goal (same amount), and left in place
    // they'd show as "this month only". Older months keep their own budgets.
    prisma.budget.deleteMany({ where: { userId, id: { in: [...latest.values()].map((b) => b.id) } } }),
  ]);
}

/** Suggested categories the user doesn't have yet (case-insensitive). */
export function suggestionsFor(existing: string[]): string[] {
  const have = new Set(existing.map((n) => n.toLowerCase()));
  return SUGGESTED_CATEGORIES.filter((n) => !have.has(n.toLowerCase()));
}

/**
 * Returns the user's spelling of a category, adding it to their list if it's
 * new. Matching ignores case, so typing "food" reuses an existing "Food"
 * instead of creating a near-duplicate.
 */
export async function resolveCategory(userId: string, name: string): Promise<string> {
  // Seed the full list first, or this one category would make the account look
  // already set up and its existing categories and goals would never be imported.
  await ensureCategories(userId);
  const existing = await prisma.category.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing.name;
  await prisma.category.createMany({ data: [{ userId, name }], skipDuplicates: true });
  return name;
}

export interface EffectiveBudget {
  category: string;
  categoryId: string | null;
  amount: number;
  /** "goal" = the category's every-month goal; "month" = a one-month override. */
  source: "goal" | "month";
  /** The override's id when `source` is "month". */
  overrideId: string | null;
}

/** The budget that applies to each category in `month`. */
export async function effectiveBudgets(userId: string, month: string): Promise<EffectiveBudget[]> {
  await ensureCategories(userId);
  const [categories, overrides] = await Promise.all([
    prisma.category.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId, month } }),
  ]);
  const byName = new Map(categories.map((c) => [c.name, c]));
  const result = new Map<string, EffectiveBudget>();

  for (const c of categories) {
    if (c.archived || !c.monthlyGoal) continue;
    result.set(c.name, { category: c.name, categoryId: c.id, amount: c.monthlyGoal, source: "goal", overrideId: null });
  }
  for (const o of overrides) {
    result.set(o.category, {
      category: o.category,
      categoryId: byName.get(o.category)?.id ?? null,
      amount: o.amount,
      source: "month",
      overrideId: o.id,
    });
  }
  return [...result.values()].sort((a, b) => a.category.localeCompare(b.category));
}

/** Amount spent per category in `month`. */
export async function spentByCategory(userId: string, month: string): Promise<Map<string, number>> {
  const { start, end } = monthRange(month);
  const groups = await prisma.expense.groupBy({
    by: ["category"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return new Map(groups.map((g) => [g.category, g._sum.amount ?? 0]));
}

function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Sends an in-app alert when a category (or total spending) reaches 80% of its
 * budget for `month`, and another when it goes over 100%. Each alert is sent at
 * most once per category per month: it's recorded in BudgetAlert first, and a
 * key that's already there means it was sent before.
 *
 * Never throws: a failed alert must not fail the expense that triggered it.
 */
export async function checkBudgetAlerts(userId: string, month: string): Promise<void> {
  try {
    const [budgets, spent] = await Promise.all([effectiveBudgets(userId, month), spentByCategory(userId, month)]);
    const label = monthName(month);
    const alerts: { type: string; title: string; body: string; dedupeKey: string }[] = [];

    const consider = (key: string, name: string, budget: number, actual: number) => {
      if (budget <= 0) return;
      const percent = Math.round((actual / budget) * 100);
      if (percent >= 100) {
        alerts.push({
          type: "budget_exceeded",
          title: `Over budget: ${name}`,
          body: `You've spent ${money(actual)} against your ${money(budget)} ${name} budget for ${label} — ${money(actual - budget)} over.`,
          dedupeKey: `budget:${month}:${key}:over`,
        });
      } else if (percent >= WARN_PERCENT) {
        alerts.push({
          type: "budget_warning",
          title: `Nearing limit: ${name}`,
          body: `You've used ${percent}% of your ${money(budget)} ${name} budget for ${label}. ${money(budget - actual)} left.`,
          dedupeKey: `budget:${month}:${key}:warning`,
        });
      }
    };

    for (const b of budgets) consider(b.category, b.category, b.amount, spent.get(b.category) ?? 0);

    // Overall: total spending against the sum of all budgets for the month.
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = [...spent.values()].reduce((s, v) => s + v, 0);
    consider(TOTAL_KEY, "total monthly", totalBudget, totalSpent);

    if (!alerts.length) return;
    const sent = await prisma.budgetAlert.findMany({
      where: { userId, key: { in: alerts.map((a) => a.dedupeKey) } },
      select: { key: true },
    });
    const sentKeys = new Set(sent.map((s) => s.key));

    for (const { dedupeKey, ...alert } of alerts) {
      if (sentKeys.has(dedupeKey)) continue;
      try {
        // The unique key makes this fail if a concurrent request already sent it.
        await prisma.budgetAlert.create({ data: { userId, key: dedupeKey } });
      } catch (err) {
        if ((err as { code?: string }).code === "P2002") continue;
        throw err;
      }
      await prisma.notification.create({ data: { ...alert, userId } });
    }
  } catch (err) {
    console.error("🔔 Budget alert check failed:", (err as Error).message);
  }
}

/** Runs the alert check for every distinct month among `dates`. */
export async function checkBudgetAlertsForDates(userId: string, dates: Date[]): Promise<void> {
  for (const month of new Set(dates.map(toMonthKey))) await checkBudgetAlerts(userId, month);
}
