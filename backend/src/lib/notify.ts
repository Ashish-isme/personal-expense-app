// Notification fan-out: writes in-app notifications and (optionally) emails them.

import { prisma } from "./prisma.js";
import { sendMail, emailLayout } from "./mailer.js";

export type NotificationType =
  | "expense_added"
  | "settlement_requested"
  | "settlement_confirmed"
  | "settlement_declined"
  | "monthly_summary"
  | "member_joined"
  | "budget_warning"
  | "budget_exceeded";

/** Formats an amount the way the app displays money, e.g. "Rs 12,500". */
export const money = (n: number) => `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

interface NotifyInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  groupId?: string;
  /** Also send an email. Silently skipped when SMTP isn't configured. */
  email?: boolean;
}

/**
 * Creates an in-app notification for each user, and optionally emails them.
 *
 * Never throws: a notification failing must not roll back the action that
 * triggered it (recording an expense, confirming a settlement, …).
 */
export async function notify({ userIds, type, title, body, groupId, email }: NotifyInput): Promise<void> {
  const targets = [...new Set(userIds)];
  if (targets.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: targets.map((userId) => ({ userId, type, title, body, groupId: groupId ?? null })),
    });

    if (email) {
      const users = await prisma.user.findMany({
        where: { id: { in: targets } },
        select: { email: true },
      });
      await Promise.all(
        users.map((u) => sendMail({ to: u.email, subject: title, html: emailLayout(title, body) }))
      );
    }
  } catch (err) {
    console.error("🔔 Failed to deliver notification:", (err as Error).message);
  }
}
