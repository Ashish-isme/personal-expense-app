import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, debtSchema } from "../lib/validation.js";

const router = Router();

// GET /api/debts — optional ?direction=i_owe|owed_to_me, ?status=pending|paid
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { direction, status } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { userId: req.userId };
    if (direction) where.direction = direction;
    if (status) where.status = status;

    const debts = await prisma.debt.findMany({ where, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });
    res.json(debts);
  })
);

// POST /api/debts
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(debtSchema, req.body);
    const debt = await prisma.debt.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json(debt);
  })
);

// PUT /api/debts/:id
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(debtSchema, req.body);
    const owned = await prisma.debt.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!owned) return res.status(404).json({ error: "Debt not found" });
    const debt = await prisma.debt.update({ where: { id: req.params.id }, data });
    res.json(debt);
  })
);

// PATCH /api/debts/:id/toggle — quickly flip pending <-> paid
router.patch(
  "/:id/toggle",
  asyncHandler(async (req, res) => {
    const existing = await prisma.debt.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Debt not found" });
    const debt = await prisma.debt.update({
      where: { id: req.params.id },
      data: { status: existing.status === "paid" ? "pending" : "paid" },
    });
    res.json(debt);
  })
);

// DELETE /api/debts/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.debt.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Debt not found" });
    res.status(204).end();
  })
);

export default router;
