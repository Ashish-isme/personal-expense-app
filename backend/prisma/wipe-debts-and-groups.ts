/**
 * One-off cleanup: deletes every Money Owed entry and every group (with its
 * members, shared expenses, splits and settlements), plus the notifications
 * about group activity — for ALL accounts in the target database.
 *
 * Safe by default: without --confirm it only reports what it would delete.
 * With --confirm it first writes a full JSON backup to backend/backups/.
 *
 *   npx tsx prisma/wipe-debts-and-groups.ts                 # dry run
 *   npx tsx prisma/wipe-debts-and-groups.ts --confirm       # back up, then delete
 *
 * The connection string is read from backend/.env.production.local (git-ignored),
 * or from the file given with --env-file <path>. It never falls back to .env, so
 * it can't hit the wrong database by accident.
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const envFlag = args.indexOf("--env-file");
const envFile = resolve(envFlag >= 0 ? args[envFlag + 1] : ".env.production.local");

if (!existsSync(envFile)) {
  console.error(`✖ ${envFile} not found.`);
  console.error(`  Create it with one line:  DATABASE_URL="<your live Neon connection string>"`);
  process.exit(1);
}
const url = config({ path: envFile, processEnv: {} }).parsed?.DATABASE_URL;
if (!url) {
  console.error(`✖ ${envFile} has no DATABASE_URL.`);
  process.exit(1);
}

const target = new URL(url);
const prisma = new PrismaClient({ datasourceUrl: url });

/** Notification types that only make sense while groups exist. */
const GROUP_NOTIFICATION_TYPES = [
  "expense_added",
  "settlement_requested",
  "settlement_confirmed",
  "settlement_declined",
  "member_joined",
  "monthly_summary",
];
const groupNotifications = {
  OR: [{ groupId: { not: null } }, { type: { in: GROUP_NOTIFICATION_TYPES } }],
};

async function counts() {
  const [debts, owedToMe, iOwe, groups, members, expenses, splits, settlements, notifications] = await Promise.all([
    prisma.debt.count(),
    prisma.debt.count({ where: { direction: "owed_to_me" } }),
    prisma.debt.count({ where: { direction: "i_owe" } }),
    prisma.group.count(),
    prisma.groupMember.count(),
    prisma.groupExpense.count(),
    prisma.groupExpenseSplit.count(),
    prisma.settlement.count(),
    prisma.notification.count({ where: groupNotifications }),
  ]);
  return { debts, owedToMe, iOwe, groups, members, expenses, splits, settlements, notifications };
}

function report(c: Awaited<ReturnType<typeof counts>>) {
  console.log(`  Money Owed entries:     ${c.debts}  (owed to you: ${c.owedToMe}, you owe: ${c.iOwe})`);
  console.log(`  Groups:                 ${c.groups}`);
  console.log(`    members:              ${c.members}`);
  console.log(`    shared expenses:      ${c.expenses}  (${c.splits} splits)`);
  console.log(`    settlements:          ${c.settlements}`);
  console.log(`  Group notifications:    ${c.notifications}`);
}

async function main() {
  console.log(`Target database: ${target.hostname}${target.pathname}`);
  const before = await counts();
  console.log("\nWould delete (all accounts):");
  report(before);

  if (!confirm) {
    console.log("\nDry run — nothing was deleted. Re-run with --confirm to back up and delete.");
    return;
  }

  // Full backup of everything about to be deleted.
  const backup = {
    takenAt: new Date().toISOString(),
    database: `${target.hostname}${target.pathname}`,
    debts: await prisma.debt.findMany(),
    groups: await prisma.group.findMany({
      include: { members: true, expenses: { include: { splits: true } }, settlements: true },
    }),
    notifications: await prisma.notification.findMany({ where: groupNotifications }),
  };
  const dir = resolve("backups");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `debts-and-groups-${backup.takenAt.replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\n✔ Backup written to ${file}`);

  // Deleting a group cascades to its members, expenses, splits and settlements.
  const [n, d, g] = await prisma.$transaction([
    prisma.notification.deleteMany({ where: groupNotifications }),
    prisma.debt.deleteMany({}),
    prisma.group.deleteMany({}),
  ]);
  console.log(`✔ Deleted ${d.count} Money Owed entries, ${g.count} groups, ${n.count} group notifications.`);

  const after = await counts();
  console.log("\nRemaining:");
  report(after);
}

main()
  .catch((err) => {
    console.error("✖ Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
