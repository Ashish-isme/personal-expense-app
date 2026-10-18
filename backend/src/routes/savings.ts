import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, savingsGoalSchema, savingsMoveSchema } from "../lib/validation.js";

const router = Router();

// GET /api/savings — goals with a deadline first, soonest first.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
    res.json(goals);
  })
);

// POST /api/savings
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(savingsGoalSchema, req.body);
    const goal = await prisma.savingsGoal.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json(goal);
  })
);

// PUT /api/savings/:id
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(savingsGoalSchema, req.body);
    const owned = await prisma.savingsGoal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!owned) return res.status(404).json({ error: "Savings goal not found" });
    const goal = await prisma.savingsGoal.update({ where: { id: req.params.id }, data });
    res.json(goal);
  })
);

// PATCH /api/savings/:id/move — add money to (positive) or take money out of (negative) a goal.
router.patch(
  "/:id/move",
  asyncHandler(async (req, res) => {
    const { amount } = parseBody(savingsMoveSchema, req.body);
    const existing = await prisma.savingsGoal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Savings goal not found" });
    if (existing.savedAmount + amount < 0) {
      return res.status(400).json({ error: "You can't take out more than is saved" });
    }
    const goal = await prisma.savingsGoal.update({
      where: { id: req.params.id },
      data: { savedAmount: { increment: amount } },
    });
    res.json(goal);
  })
);

// DELETE /api/savings/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.savingsGoal.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Savings goal not found" });
    res.status(204).end();
  })
);

export default router;
