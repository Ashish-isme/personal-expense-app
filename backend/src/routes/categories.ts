import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody } from "../lib/validation.js";
import { ensureCategories, suggestionsFor, checkBudgetAlerts } from "../lib/budgets.js";
import { toMonthKey } from "../lib/dates.js";

const router = Router();

const nameField = z.string().trim().min(1, "Name is required").max(40, "Name must be 40 characters or fewer");
const goalField = z.coerce.number().nonnegative("Goal must be 0 or more").nullable();

const createSchema = z.object({ name: nameField, monthlyGoal: goalField.optional() });
const updateSchema = z.object({
  name: nameField.optional(),
  monthlyGoal: goalField.optional(),
  archived: z.boolean().optional(),
});

function conflict(message: string) {
  const err = new Error(message) as Error & { status?: number };
  err.status = 409;
  return err;
}

/** Finds the user's category with this name, ignoring case ("food" matches "Food"). */
function findByName(userId: string, name: string) {
  return prisma.category.findFirst({ where: { userId, name: { equals: name, mode: "insensitive" } } });
}

// GET /api/categories — the user's categories plus suggestions they don't have yet.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    await ensureCategories(req.userId!);
    const items = await prisma.category.findMany({ where: { userId: req.userId }, orderBy: { name: "asc" } });
    res.json({ items, suggestions: suggestionsFor(items.map((c) => c.name)) });
  })
);

// POST /api/categories — add one. Re-adding an archived category brings it back.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, monthlyGoal } = parseBody(createSchema, req.body);
    const existing = await findByName(req.userId!, name);
    if (existing && !existing.archived) throw conflict(`You already have a "${existing.name}" category`);

    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { archived: false, ...(monthlyGoal !== undefined ? { monthlyGoal } : {}) },
        })
      : await prisma.category.create({ data: { userId: req.userId!, name, monthlyGoal: monthlyGoal ?? null } });

    if (category.monthlyGoal) await checkBudgetAlerts(req.userId!, toMonthKey(new Date()));
    res.status(201).json(category);
  })
);

// PATCH /api/categories/:id — rename, change the monthly goal, or archive/restore.
// Renaming also renames the category on the user's expenses, budgets and recurring rules.
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(updateSchema, req.body);
    const uid = req.userId!;
    const current = await prisma.category.findFirst({ where: { id: req.params.id, userId: uid } });
    if (!current) return res.status(404).json({ error: "Category not found" });

    const renaming = data.name !== undefined && data.name !== current.name;
    if (renaming) {
      const clash = await findByName(uid, data.name!);
      if (clash && clash.id !== current.id) throw conflict(`You already have a "${clash.name}" category`);
    }

    const [category] = await prisma.$transaction([
      prisma.category.update({ where: { id: current.id }, data }),
      ...(renaming
        ? [
            prisma.expense.updateMany({ where: { userId: uid, category: current.name }, data: { category: data.name } }),
            prisma.budget.updateMany({ where: { userId: uid, category: current.name }, data: { category: data.name } }),
            prisma.recurring.updateMany({
              where: { userId: uid, type: "expense", category: current.name },
              data: { category: data.name },
            }),
          ]
        : []),
    ]);

    if (data.monthlyGoal !== undefined || data.archived !== undefined) {
      await checkBudgetAlerts(uid, toMonthKey(new Date()));
    }
    res.json(category);
  })
);

export default router;
