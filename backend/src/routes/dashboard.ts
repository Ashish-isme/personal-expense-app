import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/validation.js";
import { monthRange, toMonthKey, monthLabel } from "../lib/dates.js";
import { effectiveBudgets } from "../lib/budgets.js";

const router = Router();

/**
 * GET /api/dashboard?month=YYYY-MM
 * Returns every summary metric and chart dataset the dashboard needs
 * in a single round-trip.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(month);
    const uid = req.userId;

    const [
      monthIncomeAgg,
      monthExpenseAgg,
      budgets,
      allIncomeAgg,
      allExpenseAgg,
      receivableAgg,
      payableAgg,
      categoryGroups,
      recentExpenses,
      recentIncome,
    ] = await Promise.all([
      prisma.income.aggregate({ _sum: { amount: true }, where: { userId: uid, date: { gte: start, lt: end } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { userId: uid, date: { gte: start, lt: end } } }),
      effectiveBudgets(uid!, month),
      prisma.income.aggregate({ _sum: { amount: true }, where: { userId: uid } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { userId: uid } }),
      // Money others owe me (still pending)
      prisma.debt.aggregate({ _sum: { amount: true }, where: { userId: uid, direction: "owed_to_me", status: "pending" } }),
      // Money I owe (still pending)
      prisma.debt.aggregate({ _sum: { amount: true }, where: { userId: uid, direction: "i_owe", status: "pending" } }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { userId: uid, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.expense.findMany({ where: { userId: uid }, orderBy: { date: "desc" }, take: 8 }),
      prisma.income.findMany({ where: { userId: uid }, orderBy: { date: "desc" }, take: 8 }),
    ]);

    const monthlyIncome = monthIncomeAgg._sum.amount ?? 0;
    const totalExpenses = monthExpenseAgg._sum.amount ?? 0;
    const monthlyBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const moneyToReceive = receivableAgg._sum.amount ?? 0;
    const moneyToPay = payableAgg._sum.amount ?? 0;

    const lifetimeIncome = allIncomeAgg._sum.amount ?? 0;
    const lifetimeExpenses = allExpenseAgg._sum.amount ?? 0;

    const summary = {
      monthlyIncome,
      monthlyBudget,
      totalExpenses,
      remainingBudget: monthlyBudget - totalExpenses,
      savings: monthlyIncome - totalExpenses,
      moneyToReceive,
      moneyToPay,
      // Net worth: everything ever saved, plus what's owed to me, minus what I owe.
      netWorth: lifetimeIncome - lifetimeExpenses + moneyToReceive - moneyToPay,
    };

    // Spending-by-category dataset for the pie chart.
    const spendingByCategory = categoryGroups
      .map((g) => ({ category: g.category, amount: g._sum.amount ?? 0 }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly spending trend for the last 6 months (including the selected month).
    const [ry, rm] = month.split("-").map(Number);
    const trendStart = new Date(ry, rm - 6, 1); // 6 months back
    const trendExpenses = await prisma.expense.findMany({
      where: { userId: uid, date: { gte: trendStart, lt: end } },
      select: { date: true, amount: true },
    });
    const trendIncome = await prisma.income.findMany({
      where: { userId: uid, date: { gte: trendStart, lt: end } },
      select: { date: true, amount: true },
    });

    const trendMap = new Map<string, { expense: number; income: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ry, rm - 1 - i, 1);
      trendMap.set(toMonthKey(d), { expense: 0, income: 0 });
    }
    for (const e of trendExpenses) {
      const key = toMonthKey(e.date);
      const cur = trendMap.get(key);
      if (cur) cur.expense += e.amount;
    }
    for (const inc of trendIncome) {
      const key = toMonthKey(inc.date);
      const cur = trendMap.get(key);
      if (cur) cur.income += inc.amount;
    }
    const monthlyTrend = Array.from(trendMap.entries()).map(([key, v]) => ({
      month: key,
      label: monthLabel(key),
      expense: v.expense,
      income: v.income,
    }));

    // Merge recent expenses and income into one recent-activity feed.
    const recentTransactions = [
      ...recentExpenses.map((e) => ({
        id: e.id,
        type: "expense" as const,
        date: e.date,
        title: e.description,
        subtitle: e.category,
        amount: e.amount,
      })),
      ...recentIncome.map((i) => ({
        id: i.id,
        type: "income" as const,
        date: i.date,
        title: i.source,
        subtitle: "Income",
        amount: i.amount,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    res.json({ month, summary, spendingByCategory, monthlyTrend, recentTransactions });
  })
);

export default router;
