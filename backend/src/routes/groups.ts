import { Router } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import {
  asyncHandler,
  parseBody,
  groupSchema,
  groupExpenseSchema,
  settlementSchema,
} from "../lib/validation.js";
import { computeSplits } from "../lib/splits.js";
import { computeGroupBalances } from "../lib/balances.js";
import { notify } from "../lib/notify.js";

const router = Router();

const memberSelect = { id: true, name: true, email: true } as const;
const displayName = (u: { name: string | null; email: string }) => u.name || u.email;
const money = (n: number) => `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function httpError(message: string, status: number): Error & { status?: number } {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  return err;
}

/** Unambiguous invite code — no 0/O/1/I to avoid transcription mistakes. */
function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Throws 403/404 unless the requesting user is a member of the group. */
async function assertMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw httpError("Group not found", 404);
}

// ---- Groups ------------------------------------------------------------------

// GET /api/groups — groups the user belongs to, with their net position in each.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.userId },
      include: {
        group: {
          include: {
            _count: { select: { members: true, expenses: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const { members } = await computeGroupBalances(m.groupId);
        const mine = members.find((b) => b.userId === req.userId);
        return {
          id: m.group.id,
          name: m.group.name,
          inviteCode: m.group.inviteCode,
          createdById: m.group.createdById,
          memberCount: m.group._count.members,
          expenseCount: m.group._count.expenses,
          // >0 you are owed, <0 you owe.
          net: mine?.net ?? 0,
        };
      })
    );

    res.json(groups);
  })
);

// POST /api/groups — create a group; the creator is its first member.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = parseBody(groupSchema, req.body);

    const group = await prisma.group.create({
      data: {
        name,
        inviteCode: generateInviteCode(),
        createdById: req.userId!,
        members: { create: { userId: req.userId! } },
      },
    });

    res.status(201).json(group);
  })
);

// POST /api/groups/join — join a group using an invite code.
router.post(
  "/join",
  asyncHandler(async (req, res) => {
    const code = String(req.body?.inviteCode || "").trim().toUpperCase();
    if (!code) throw httpError("An invite code is required", 400);

    const group = await prisma.group.findUnique({ where: { inviteCode: code } });
    if (!group) throw httpError("That invite code doesn't match any group", 404);

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
    });
    if (existing) return res.json(group); // already a member — treat as success

    await prisma.groupMember.create({ data: { groupId: group.id, userId: req.userId! } });

    const joiner = await prisma.user.findUnique({ where: { id: req.userId }, select: memberSelect });
    const others = await prisma.groupMember.findMany({
      where: { groupId: group.id, userId: { not: req.userId } },
      select: { userId: true },
    });
    await notify({
      userIds: others.map((o) => o.userId),
      type: "member_joined",
      title: `${displayName(joiner!)} joined ${group.name}`,
      body: `${displayName(joiner!)} is now part of the group and can share expenses.`,
      groupId: group.id,
    });

    res.status(201).json(group);
  })
);

// GET /api/groups/:id — group detail: members, balances, expenses, settlements.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    await assertMember(groupId, req.userId!);

    const [group, expenses, settlements, balances] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: { select: memberSelect } }, orderBy: { joinedAt: "asc" } } },
      }),
      prisma.groupExpense.findMany({
        where: { groupId },
        include: {
          paidBy: { select: memberSelect },
          splits: { include: { user: { select: memberSelect } } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: { select: memberSelect },
          toUser: { select: memberSelect },
        },
        orderBy: { createdAt: "desc" },
      }),
      computeGroupBalances(groupId),
    ]);

    res.json({
      id: group!.id,
      name: group!.name,
      inviteCode: group!.inviteCode,
      createdById: group!.createdById,
      members: group!.members.map((m) => m.user),
      balances: balances.members,
      transfers: balances.transfers,
      expenses,
      settlements,
    });
  })
);

// DELETE /api/groups/:id — only the creator can delete. Cascades to everything.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) throw httpError("Group not found", 404);
    if (group.createdById !== req.userId) {
      throw httpError("Only the group's creator can delete it", 403);
    }
    await prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// POST /api/groups/:id/leave — leave a group, but only once settled up.
router.post(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    await assertMember(groupId, req.userId!);

    const { members } = await computeGroupBalances(groupId);
    const mine = members.find((b) => b.userId === req.userId);
    if (mine && Math.round(mine.net * 100) !== 0) {
      throw httpError(
        mine.net < 0
          ? `You still owe ${money(Math.abs(mine.net))} in this group. Settle up before leaving.`
          : `You're still owed ${money(mine.net)} in this group. Collect it before leaving.`,
        400
      );
    }

    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: req.userId! } } });
    res.status(204).end();
  })
);

// ---- Group expenses ----------------------------------------------------------

// POST /api/groups/:id/expenses — record a shared expense and its splits.
router.post(
  "/:id/expenses",
  asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    await assertMember(groupId, req.userId!);

    const data = parseBody(groupExpenseSchema, req.body);
    const paidById = data.paidById || req.userId!;

    // Everyone involved must actually be in the group.
    const memberIds = new Set(
      (await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
        (m) => m.userId
      )
    );
    if (!memberIds.has(paidById)) throw httpError("The payer isn't a member of this group", 400);
    for (const p of data.participants) {
      if (!memberIds.has(p.userId)) throw httpError("A participant isn't a member of this group", 400);
    }

    // Throws a 400 if the shares don't reconcile against the total.
    const splits = computeSplits(data.amount, data.splitMode, data.participants);

    const expense = await prisma.groupExpense.create({
      data: {
        groupId,
        paidById,
        description: data.description,
        amount: data.amount,
        date: data.date,
        splitMode: data.splitMode,
        notes: data.notes ?? null,
        splits: { create: splits.map((s) => ({ userId: s.userId, amount: s.amount })) },
      },
      include: {
        paidBy: { select: memberSelect },
        splits: { include: { user: { select: memberSelect } } },
      },
    });

    // Tell everyone who owes a share — except whoever paid.
    const payer = displayName(expense.paidBy);
    await notify({
      userIds: splits.map((s) => s.userId).filter((id) => id !== paidById),
      type: "expense_added",
      title: `${payer} added "${data.description}"`,
      body: `${payer} paid ${money(data.amount)}. Your share is ${money(
        splits.find((s) => s.userId !== paidById)?.amount ?? 0
      )}.`,
      groupId,
    });

    res.status(201).json(expense);
  })
);

// DELETE /api/groups/:gid/expenses/:eid — the payer or the group creator can remove it.
router.delete(
  "/:gid/expenses/:eid",
  asyncHandler(async (req, res) => {
    const { gid, eid } = req.params;
    await assertMember(gid, req.userId!);

    const expense = await prisma.groupExpense.findFirst({
      where: { id: eid, groupId: gid },
      include: { group: { select: { createdById: true } } },
    });
    if (!expense) throw httpError("Expense not found", 404);
    if (expense.paidById !== req.userId && expense.group.createdById !== req.userId) {
      throw httpError("Only the person who paid, or the group's creator, can delete this", 403);
    }

    await prisma.groupExpense.delete({ where: { id: eid } });
    res.status(204).end();
  })
);

// ---- Settlements -------------------------------------------------------------

// POST /api/groups/:id/settlements — "I paid you back." Awaits the recipient's confirmation.
router.post(
  "/:id/settlements",
  asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    await assertMember(groupId, req.userId!);

    const data = parseBody(settlementSchema, req.body);
    if (data.toUserId === req.userId) throw httpError("You can't settle up with yourself", 400);
    await assertMember(groupId, data.toUserId); // recipient must be in the group too

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUserId: req.userId!,
        toUserId: data.toUserId,
        amount: data.amount,
        note: data.note ?? null,
        status: "pending",
      },
      include: { fromUser: { select: memberSelect }, toUser: { select: memberSelect } },
    });

    await notify({
      userIds: [data.toUserId],
      type: "settlement_requested",
      title: `${displayName(settlement.fromUser)} says they paid you ${money(data.amount)}`,
      body: `Confirm you received it to mark this settled. Until you confirm, the balance stays as it is.`,
      groupId,
    });

    res.status(201).json(settlement);
  })
);

// PATCH /api/groups/:gid/settlements/:sid — recipient confirms or declines.
// Body: { action: "confirm" | "decline" }
router.patch(
  "/:gid/settlements/:sid",
  asyncHandler(async (req, res) => {
    const { gid, sid } = req.params;
    await assertMember(gid, req.userId!);

    const action = req.body?.action;
    if (action !== "confirm" && action !== "decline") {
      throw httpError('action must be "confirm" or "decline"', 400);
    }

    const settlement = await prisma.settlement.findFirst({
      where: { id: sid, groupId: gid },
      include: { fromUser: { select: memberSelect }, toUser: { select: memberSelect } },
    });
    if (!settlement) throw httpError("Settlement not found", 404);

    // Only the person who supposedly received the money can confirm it.
    if (settlement.toUserId !== req.userId) {
      throw httpError("Only the recipient can confirm or decline this payment", 403);
    }
    if (settlement.status !== "pending") {
      throw httpError(`This payment is already ${settlement.status}`, 409);
    }

    const confirmed = action === "confirm";
    const updated = await prisma.settlement.update({
      where: { id: sid },
      data: {
        status: confirmed ? "confirmed" : "declined",
        confirmedAt: confirmed ? new Date() : null,
      },
      include: { fromUser: { select: memberSelect }, toUser: { select: memberSelect } },
    });

    await notify({
      userIds: [settlement.fromUserId],
      type: confirmed ? "settlement_confirmed" : "settlement_declined",
      title: confirmed
        ? `${displayName(settlement.toUser)} confirmed your ${money(settlement.amount)} payment`
        : `${displayName(settlement.toUser)} declined your ${money(settlement.amount)} payment`,
      body: confirmed
        ? "The payment is settled and your balance has been updated."
        : "They didn't recognise this payment. Check with them and try again.",
      groupId: gid,
    });

    res.json(updated);
  })
);

export default router;
