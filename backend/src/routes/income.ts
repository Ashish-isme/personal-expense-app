import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, incomeSchema } from "../lib/validation.js";

const router = Router();

// GET /api/income — optional ?month=YYYY-MM, ?limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { month, limit } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { userId: req.userId };
    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    const income = await prisma.income.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit ? Number(limit) : undefined,
    });
    res.json(income);
  })
);

// POST /api/income
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(incomeSchema, req.body);
    const income = await prisma.income.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json(income);
  })
);

// PUT /api/income/:id
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(incomeSchema, req.body);
    const owned = await prisma.income.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!owned) return res.status(404).json({ error: "Income not found" });
    const income = await prisma.income.update({ where: { id: req.params.id }, data });
    res.json(income);
  })
);

// DELETE /api/income/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.income.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Income not found" });
    res.status(204).end();
  })
);

export default router;
