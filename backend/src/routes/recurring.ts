import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, recurringSchema } from "../lib/validation.js";
import { advanceDate } from "../lib/dates.js";

const router = Router();

// Safety cap so a rule with a far-past start date can't spin forever.
const MAX_OCCURRENCES_PER_RUN = 120;

// GET /api/recurring — all rules for the user, active first.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rules = await prisma.recurring.findMany({
      where: { userId: req.userId },
      orderBy: [{ active: "desc" }, { nextRun: "asc" }],
    });
    res.json(rules);
  })
);

// POST /api/recurring — create a rule. nextRun starts at the start date.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(recurringSchema, req.body);
    const rule = await prisma.recurring.create({
      data: { ...data, userId: req.userId!, nextRun: data.startDate },
    });
    res.status(201).json(rule);
  })
);

// PUT /api/recurring/:id — update a rule. Resets nextRun to the start date
// only if the start date itself changed.
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(recurringSchema, req.body);
    const existing = await prisma.recurring.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Recurring rule not found" });

    const startChanged = existing.startDate.getTime() !== data.startDate.getTime();
    const rule = await prisma.recurring.update({
      where: { id: req.params.id },
      data: { ...data, ...(startChanged ? { nextRun: data.startDate } : {}) },
    });
    res.json(rule);
  })
);

// PATCH /api/recurring/:id/toggle — flip active on/off.
router.patch(
  "/:id/toggle",
  asyncHandler(async (req, res) => {
    const existing = await prisma.recurring.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Recurring rule not found" });
    const rule = await prisma.recurring.update({
      where: { id: req.params.id },
      data: { active: !existing.active },
    });
    res.json(rule);
  })
);

// DELETE /api/recurring/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.recurring.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (count === 0) return res.status(404).json({ error: "Recurring rule not found" });
    res.status(204).end();
  })
);

// POST /api/recurring/run — generate any due occurrences up to today.
// Returns how many expenses/income records were created. Idempotent: running
// again immediately produces nothing because nextRun has already advanced.
router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const created = await materializeDue(req.userId!);
    res.json(created);
  })
);

/**
 * Generates concrete Expense / Income rows for every active rule whose
 * `nextRun` is on or before today, advancing `nextRun` each time.
 */
export async function materializeDue(userId: string): Promise<{ expenses: number; income: number }> {
  // "Today" at end of day, so a rule due today is included.
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const rules = await prisma.recurring.findMany({ where: { userId, active: true } });

  const expensesToCreate: {
    userId: string; date: Date; category: string; description: string; amount: number; paymentMethod: string; notes: string | null;
  }[] = [];
  const incomeToCreate: { userId: string; date: Date; source: string; amount: number; notes: string | null }[] = [];
  const nextRunUpdates: { id: string; nextRun: Date }[] = [];

  for (const rule of rules) {
    const freq = rule.frequency === "weekly" ? "weekly" : "monthly";
    // Anchor monthly recurrences to the day-of-month the rule started on.
    const anchorDay = rule.startDate.getUTCDate();
    let cursor = rule.nextRun;
    let guard = 0;

    while (cursor <= cutoff && (!rule.endDate || cursor <= rule.endDate) && guard < MAX_OCCURRENCES_PER_RUN) {
      if (rule.type === "income") {
        incomeToCreate.push({ userId, date: cursor, source: rule.category, amount: rule.amount, notes: rule.notes });
      } else {
        expensesToCreate.push({
          userId,
          date: cursor,
          category: rule.category,
          description: rule.description,
          amount: rule.amount,
          paymentMethod: rule.paymentMethod,
          notes: rule.notes,
        });
      }
      cursor = advanceDate(cursor, freq, anchorDay);
      guard++;
    }

    if (guard > 0) nextRunUpdates.push({ id: rule.id, nextRun: cursor });
  }

  // Persist everything in one transaction so a rule's nextRun only advances if
  // its generated rows were committed.
  await prisma.$transaction([
    ...(expensesToCreate.length ? [prisma.expense.createMany({ data: expensesToCreate })] : []),
    ...(incomeToCreate.length ? [prisma.income.createMany({ data: incomeToCreate })] : []),
    ...nextRunUpdates.map((u) => prisma.recurring.update({ where: { id: u.id }, data: { nextRun: u.nextRun } })),
  ]);

  return { expenses: expensesToCreate.length, income: incomeToCreate.length };
}

export default router;
