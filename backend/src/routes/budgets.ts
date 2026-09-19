import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, budgetSchema } from "../lib/validation.js";
import { effectiveBudgets, spentByCategory, checkBudgetAlerts, resolveCategory } from "../lib/budgets.js";

const router = Router();

/**
 * GET /api/budgets?month=YYYY-MM
 * Returns the budget in effect for each category that month — its standing
 * goal, or that month's override — enriched with the actual amount spent,
 * remaining amount, and percentage used.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const [budgets, spent] = await Promise.all([
      effectiveBudgets(req.userId!, month),
      spentByCategory(req.userId!, month),
    ]);

    const enriched = budgets.map((b) => {
      const actual = spent.get(b.category) ?? 0;
      const remaining = b.amount - actual;
      const percentUsed = b.amount > 0 ? Math.round((actual / b.amount) * 100) : 0;
      return { ...b, id: b.overrideId ?? `goal:${b.categoryId}`, month, actual, remaining, percentUsed };
    });

    res.json(enriched);
  })
);

/**
 * POST /api/budgets — set a category's budget.
 * `scope: "every"` (default) sets the category's standing monthly goal, and
 * clears one-month overrides from `month` onwards so the new goal takes effect.
 * `scope: "month"` sets an override for `month` only.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { month, amount, scope, ...body } = parseBody(budgetSchema, req.body);
    const uid = req.userId!;
    const category = await resolveCategory(uid, body.category);

    if (scope === "every") {
      await prisma.$transaction([
        prisma.category.upsert({
          where: { userId_name: { userId: uid, name: category } },
          update: { monthlyGoal: amount, archived: false },
          create: { userId: uid, name: category, monthlyGoal: amount },
        }),
        prisma.budget.deleteMany({ where: { userId: uid, category, month: { gte: month } } }),
      ]);
    } else {
      await prisma.budget.upsert({
        where: { userId_month_category: { userId: uid, month, category } },
        update: { amount },
        create: { userId: uid, month, category, amount },
      });
    }

    await checkBudgetAlerts(uid, month);
    res.status(201).json({ ok: true });
  })
);

// DELETE /api/budgets/:id — remove a one-month override (the category's goal applies again).
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.budget.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Budget not found" });
    res.status(204).end();
  })
);

export default router;
