// Group balance computation and settle-up simplification.

import { prisma } from "./prisma.js";

export interface MemberBalance {
  userId: string;
  name: string | null;
  email: string;
  /** Total this member paid out on behalf of the group. */
  paid: number;
  /** Total of this member's own shares across all group expenses. */
  owed: number;
  /** paid − owed, adjusted by confirmed settlements. >0 = they're owed money. */
  net: number;
}

export interface Transfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface GroupBalances {
  members: MemberBalance[];
  /** Minimal set of payments that would zero every balance out. */
  transfers: Transfer[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const displayName = (u: { name: string | null; email: string }) => u.name || u.email;

/**
 * Computes each member's net position in a group.
 *
 * net = (what they paid) − (their share of expenses)
 *     + (settlements they've paid) − (settlements they've received)
 *
 * Only *confirmed* settlements move the numbers. A settlement that's been
 * claimed but not yet confirmed by the recipient is deliberately ignored here,
 * so a member can't zero out their own debt unilaterally.
 */
export async function computeGroupBalances(groupId: string): Promise<GroupBalances> {
  const [members, expenses, splits, settlements] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.groupExpense.findMany({ where: { groupId }, select: { paidById: true, amount: true } }),
    prisma.groupExpenseSplit.findMany({
      where: { expense: { groupId } },
      select: { userId: true, amount: true },
    }),
    prisma.settlement.findMany({
      where: { groupId, status: "confirmed" },
      select: { fromUserId: true, toUserId: true, amount: true },
    }),
  ]);

  // Work in cents so repeated addition can't accumulate float error.
  const cents = new Map<string, { paid: number; owed: number; net: number }>();
  for (const m of members) cents.set(m.userId, { paid: 0, owed: 0, net: 0 });

  const bump = (userId: string, field: "paid" | "owed" | "net", value: number) => {
    const entry = cents.get(userId);
    // Ignore rows belonging to someone who has since left the group.
    if (entry) entry[field] += value;
  };

  for (const e of expenses) {
    const c = Math.round(e.amount * 100);
    bump(e.paidById, "paid", c);
    bump(e.paidById, "net", c);
  }
  for (const s of splits) {
    const c = Math.round(s.amount * 100);
    bump(s.userId, "owed", c);
    bump(s.userId, "net", -c);
  }
  for (const s of settlements) {
    const c = Math.round(s.amount * 100);
    // Paying down a debt raises the payer's net and lowers the recipient's.
    bump(s.fromUserId, "net", c);
    bump(s.toUserId, "net", -c);
  }

  const balances: MemberBalance[] = members.map((m) => {
    const c = cents.get(m.userId)!;
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      paid: round2(c.paid / 100),
      owed: round2(c.owed / 100),
      net: round2(c.net / 100),
    };
  });

  return { members: balances, transfers: simplify(balances) };
}

/**
 * Reduces net balances to the fewest payments that settle everyone up.
 *
 * Greedy largest-debtor-to-largest-creditor. This doesn't always find the
 * theoretical minimum (that problem is NP-hard), but it never produces more
 * than n−1 transfers and is what people intuitively expect.
 */
function simplify(balances: MemberBalance[]): Transfer[] {
  const nameOf = new Map(balances.map((b) => [b.userId, displayName(b)]));

  // Cents again — a float epsilon here would emit phantom Rs 0.00 transfers.
  const debtors = balances
    .filter((b) => Math.round(b.net * 100) < 0)
    .map((b) => ({ userId: b.userId, cents: -Math.round(b.net * 100) }))
    .sort((a, b) => b.cents - a.cents);

  const creditors = balances
    .filter((b) => Math.round(b.net * 100) > 0)
    .map((b) => ({ userId: b.userId, cents: Math.round(b.net * 100) }))
    .sort((a, b) => b.cents - a.cents);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      transfers.push({
        fromUserId: debtors[i].userId,
        fromName: nameOf.get(debtors[i].userId) ?? "",
        toUserId: creditors[j].userId,
        toName: nameOf.get(creditors[j].userId) ?? "",
        amount: round2(pay / 100),
      });
    }
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }

  return transfers;
}
