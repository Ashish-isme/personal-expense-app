import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/validation.js";
import { computeGroupBalances } from "../lib/balances.js";
import { notify, money } from "../lib/notify.js";

const router = Router();

// GET /api/notifications — newest first, plus the unread count for the bell badge.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: req.userId, read: false } }),
    ]);
    res.json({ items, unread });
  })
);

// PATCH /api/notifications/:id/read
router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const { count } = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { read: true },
    });
    if (count === 0) return res.status(404).json({ error: "Notification not found" });
    res.status(204).end();
  })
);

// POST /api/notifications/read-all
router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    });
    res.status(204).end();
  })
);

export default router;

// ---- Month-end summary -------------------------------------------------------

/**
 * Builds a settle-up summary for every user who belongs to at least one group,
 * delivering it in-app and by email (when SMTP is configured).
 *
 * Idempotent enough to be retried: re-running just produces another notification,
 * it never double-charges anything, because it only reads balances.
 */
export async function runMonthlySummary(): Promise<{ usersNotified: number }> {
  const groups = await prisma.group.findMany({
    include: { members: { select: { userId: true } } },
  });

  // userId -> the lines of their summary
  const perUser = new Map<string, string[]>();

  for (const group of groups) {
    const { members, transfers } = await computeGroupBalances(group.id);

    for (const member of members) {
      const owes = transfers.filter((t) => t.fromUserId === member.userId);
      const owed = transfers.filter((t) => t.toUserId === member.userId);
      if (owes.length === 0 && owed.length === 0) continue; // settled up — nothing to say

      const lines: string[] = [`<p><strong>${escapeHtml(group.name)}</strong></p><ul>`];
      for (const t of owes) {
        lines.push(`<li>You owe <strong>${escapeHtml(t.toName)}</strong> ${money(t.amount)}</li>`);
      }
      for (const t of owed) {
        lines.push(`<li><strong>${escapeHtml(t.fromName)}</strong> owes you ${money(t.amount)}</li>`);
      }
      lines.push("</ul>");

      const existing = perUser.get(member.userId) ?? [];
      perUser.set(member.userId, [...existing, lines.join("")]);
    }
  }

  // Deliver one summary per user, covering all their groups.
  await Promise.all(
    Array.from(perUser.entries()).map(([userId, sections]) =>
      notify({
        userIds: [userId],
        type: "monthly_summary",
        title: "Your month-end settle-up summary",
        body: sections.join(""),
        email: true,
      })
    )
  );

  return { usersNotified: perUser.size };
}

/**
 * Public endpoint for an external scheduler. Protected by a shared secret rather
 * than a user session, because no user is logged in when a cron fires.
 *
 * Render's free tier sleeps after inactivity, so an in-process cron can't be
 * relied on to fire on the last day of the month. Point a free external cron
 * (e.g. cron-job.org) at this monthly instead:
 *   POST /api/cron/monthly-summary   with header  x-cron-secret: $CRON_SECRET
 */
export const monthlySummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "CRON_SECRET is not configured on the server" });
  }
  if (req.headers["x-cron-secret"] !== secret) {
    return res.status(401).json({ error: "Invalid cron secret" });
  }

  const result = await runMonthlySummary();
  res.json({ ok: true, ...result });
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
