import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, expenseSchema } from "../lib/validation.js";

const router = Router();

// GET /api/expenses — optional ?month=YYYY-MM, ?category=, ?limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { month, category, limit } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { userId: req.userId };
    if (category) where.category = category;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit ? Number(limit) : undefined,
    });
    res.json(expenses);
  })
);

// POST /api/expenses
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(expenseSchema, req.body);
    const expense = await prisma.expense.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json(expense);
  })
);

// PUT /api/expenses/:id
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(expenseSchema, req.body);
    // Ensure the record belongs to the authenticated user before updating.
    const owned = await prisma.expense.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!owned) return res.status(404).json({ error: "Expense not found" });
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
    res.json(expense);
  })
);

// DELETE /api/expenses/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.expense.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Expense not found" });
    res.status(204).end();
  })
);

export default router;
