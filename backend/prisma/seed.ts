import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { STARTER_CATEGORIES } from "../src/lib/budgets.js";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@finance.app";
const DEMO_PASSWORD = "demo1234";

/**
 * Seeds a demo user with a few months of realistic sample data so the
 * dashboard and charts have something to show. Safe to re-run — it clears
 * the demo user's existing rows first.
 *
 * Login with: demo@finance.app / demo1234
 */
async function main() {
  console.log("🌱 Seeding demo user + sample data...");

  // Create (or reuse) the demo user.
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    },
  });
  const userId = user.id;

  // Clear only this user's data so re-seeding is idempotent.
  await prisma.$transaction([
    prisma.expense.deleteMany({ where: { userId } }),
    prisma.income.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.recurring.deleteMany({ where: { userId } }),
    prisma.category.deleteMany({ where: { userId } }),
    prisma.budgetAlert.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.debt.deleteMany({ where: { userId } }),
  ]);

  const now = new Date();
  const dateIn = (offset: number, day: number) =>
    new Date(now.getFullYear(), now.getMonth() - offset, day);

  const categories = ["Groceries", "Rent", "Transport", "Dining", "Utilities", "Entertainment", "Health"];
  const methods = ["Cash", "Bank", "eSewa", "Khalti"] as const;

  // Expenses across the last 5 months.
  const expenses: {
    userId: string; date: Date; category: string; description: string; amount: number; paymentMethod: string; notes: string | null;
  }[] = [];
  const samples: Record<string, [string, number][]> = {
    Groceries: [["Weekly groceries", 4200], ["Vegetables & fruit", 1800]],
    Rent: [["Monthly rent", 18000]],
    Transport: [["Fuel", 2500], ["Bus pass", 900]],
    Dining: [["Dinner out", 2200], ["Coffee", 650]],
    Utilities: [["Electricity", 1400], ["Internet", 1500]],
    Entertainment: [["Movie tickets", 1200], ["Streaming", 700]],
    Health: [["Pharmacy", 1100]],
  };

  for (let m = 0; m < 5; m++) {
    let day = 3;
    for (const cat of categories) {
      for (const [desc, base] of samples[cat]) {
        const jitter = Math.round((base * 0.15) * ((m % 3) - 1));
        expenses.push({
          userId,
          date: dateIn(m, day),
          category: cat,
          description: desc,
          amount: base + jitter,
          paymentMethod: methods[day % methods.length],
          notes: null,
        });
        day = Math.min(28, day + 3);
      }
    }
  }
  await prisma.expense.createMany({ data: expenses });

  // Income across the last 5 months.
  const income = [];
  for (let m = 0; m < 5; m++) {
    income.push({ userId, date: dateIn(m, 1), source: "Salary", amount: 45000, notes: null });
    if (m % 2 === 0) income.push({ userId, date: dateIn(m, 15), source: "Freelance", amount: 12000, notes: "Side project" });
  }
  await prisma.income.createMany({ data: income });

  // Categories with standing monthly goals (they apply to every month).
  const monthlyGoals: Record<string, number> = {
    Groceries: 7000, Rent: 18000, Transport: 4000, Dining: 3500, Utilities: 3200, Entertainment: 2500, Health: 2000,
  };
  await prisma.category.createMany({
    data: STARTER_CATEGORIES.map((name) => ({ userId, name, monthlyGoal: monthlyGoals[name] ?? null })),
  });

  // A few debts in both directions.
  await prisma.debt.createMany({
    data: [
      { userId, person: "Ram", amount: 5000, description: "Lent for laptop repair", direction: "owed_to_me", status: "pending", dueDate: dateIn(-1, 20) },
      { userId, person: "Sita", amount: 2000, description: "Shared dinner bill", direction: "owed_to_me", status: "paid" },
      { userId, person: "Landlord", amount: 3000, description: "Deposit adjustment", direction: "i_owe", status: "pending", dueDate: dateIn(-1, 5) },
      { userId, person: "Hari", amount: 1500, description: "Borrowed cash", direction: "i_owe", status: "pending" },
    ],
  });

  console.log(`✅ Seeded ${expenses.length} expenses, ${income.length} incomes, ${STARTER_CATEGORIES.length} categories, 4 debts.`);
  console.log(`👤 Demo login →  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
