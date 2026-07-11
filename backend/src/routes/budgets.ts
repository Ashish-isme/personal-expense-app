import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, budgetSchema } from "../lib/validation.js";
import { monthRange } from "../lib/dates.js";

const router = Router();

/**
 * GET /api/budgets?month=YYYY-MM
 * Returns each budget for the month enriched with the actual amount spent
 * in that category, remaining amount, and percentage used.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(month);

    const [budgets, spentByCategory] = await Promise.all([
      prisma.budget.findMany({ where: { userId: req.userId, month }, orderBy: { category: "asc" } }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { userId: req.userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
    ]);

    const spentMap = new Map(spentByCategory.map((s) => [s.category, s._sum.amount ?? 0]));

    const enriched = budgets.map((b) => {
      const actual = spentMap.get(b.category) ?? 0;
      const remaining = b.amount - actual;
      const percentUsed = b.amount > 0 ? Math.round((actual / b.amount) * 100) : 0;
      return { ...b, actual, remaining, percentUsed };
    });

    res.json(enriched);
  })
);

// POST /api/budgets — upsert (one budget per category per month, per user)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(budgetSchema, req.body);
    const budget = await prisma.budget.upsert({
      where: { userId_month_category: { userId: req.userId!, month: data.month, category: data.category } },
      update: { amount: data.amount },
      create: { ...data, userId: req.userId! },
    });
    res.status(201).json(budget);
  })
);

// PUT /api/budgets/:id
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(budgetSchema, req.body);
    const owned = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!owned) return res.status(404).json({ error: "Budget not found" });
    const budget = await prisma.budget.update({ where: { id: req.params.id }, data });
    res.json(budget);
  })
);

// DELETE /api/budgets/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.budget.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Budget not found" });
    res.status(204).end();
  })
);

export default router;
