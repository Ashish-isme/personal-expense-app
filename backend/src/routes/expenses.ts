import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, expenseSchema } from "../lib/validation.js";

const router = Router();

// GET /api/expenses
// Filters (all optional): ?month=YYYY-MM, ?category=, ?limit=,
//   ?search= (matches description or notes), ?minAmount=, ?maxAmount=,
//   ?from=YYYY-MM-DD, ?to=YYYY-MM-DD (explicit date range; overrides ?month).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { month, category, limit, search, minAmount, maxAmount, from, to } =
      req.query as Record<string, string>;

    const where: Record<string, unknown> = { userId: req.userId };
    if (category) where.category = category;

    // Date range: an explicit from/to wins; otherwise fall back to ?month.
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(`${from}T00:00:00`);
      if (to) range.lt = new Date(new Date(`${to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000);
      where.date = range;
    } else if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    // Amount range.
    const amount: Record<string, number> = {};
    if (minAmount && !isNaN(Number(minAmount))) amount.gte = Number(minAmount);
    if (maxAmount && !isNaN(Number(maxAmount))) amount.lte = Number(maxAmount);
    if (Object.keys(amount).length) where.amount = amount;

    // Free-text search across description and notes. `mode: "insensitive"` is
    // required on Postgres, where LIKE is case-sensitive by default.
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
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
