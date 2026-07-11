import { Router } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/validation.js";
import { monthRange, yearRange, toMonthKey, monthLabel } from "../lib/dates.js";

const router = Router();

/**
 * GET /api/reports?type=monthly|yearly|category&period=YYYY-MM|YYYY
 * Returns a JSON report used both for on-screen display and as the
 * source data for CSV / Excel exports.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const type = (req.query.type as string) || "monthly";
    const report = await buildReport(req.userId!, type, req.query.period as string | undefined);
    res.json(report);
  })
);

// GET /api/reports/export.csv?type=&period=
router.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const type = (req.query.type as string) || "monthly";
    const report = await buildReport(req.userId!, type, req.query.period as string | undefined);

    const rows: string[] = [];
    rows.push(`Report Type,${report.type}`);
    rows.push(`Period,${report.period}`);
    rows.push("");
    rows.push("Category,Amount");
    for (const row of report.byCategory) {
      rows.push(`${escapeCsv(row.category)},${row.amount}`);
    }
    rows.push("");
    rows.push(`Total Income,${report.totals.income}`);
    rows.push(`Total Expenses,${report.totals.expense}`);
    rows.push(`Net,${report.totals.net}`);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="report-${report.period}.csv"`);
    res.send(rows.join("\n"));
  })
);

// GET /api/reports/export.xlsx?type=&period=
router.get(
  "/export.xlsx",
  asyncHandler(async (req, res) => {
    const type = (req.query.type as string) || "monthly";
    const report = await buildReport(req.userId!, type, req.query.period as string | undefined);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Personal Finance Tracker";

    const summary = wb.addWorksheet("Summary");
    summary.columns = [
      { header: "Metric", key: "metric", width: 24 },
      { header: "Value", key: "value", width: 18 },
    ];
    summary.addRows([
      { metric: "Report Type", value: report.type },
      { metric: "Period", value: report.period },
      { metric: "Total Income", value: report.totals.income },
      { metric: "Total Expenses", value: report.totals.expense },
      { metric: "Net", value: report.totals.net },
    ]);
    summary.getRow(1).font = { bold: true };

    const cat = wb.addWorksheet("By Category");
    cat.columns = [
      { header: "Category", key: "category", width: 24 },
      { header: "Amount", key: "amount", width: 18 },
    ];
    cat.addRows(report.byCategory);
    cat.getRow(1).font = { bold: true };

    const tx = wb.addWorksheet("Expenses");
    tx.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Category", key: "category", width: 18 },
      { header: "Description", key: "description", width: 30 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Payment Method", key: "paymentMethod", width: 16 },
      { header: "Notes", key: "notes", width: 30 },
    ];
    tx.addRows(
      report.expenses.map((e) => ({
        ...e,
        date: new Date(e.date).toISOString().slice(0, 10),
      }))
    );
    tx.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="report-${report.period}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  })
);

// ---- Report builder ----------------------------------------------------------

async function buildReport(userId: string, type: string, period?: string) {
  const now = new Date();

  if (type === "yearly") {
    const year = period ? Number(period.slice(0, 4)) : now.getFullYear();
    const { start, end } = yearRange(year);
    return assemble(userId, `Yearly`, String(year), start, end, true);
  }

  if (type === "category") {
    // Category report spans the whole selected year, grouped by category.
    const year = period ? Number(period.slice(0, 4)) : now.getFullYear();
    const { start, end } = yearRange(year);
    return assemble(userId, `Category`, String(year), start, end, false);
  }

  // Default: monthly
  const month = period && /^\d{4}-\d{2}$/.test(period) ? period : now.toISOString().slice(0, 7);
  const { start, end } = monthRange(month);
  return assemble(userId, `Monthly`, month, start, end, false);
}

async function assemble(userId: string, type: string, period: string, start: Date, end: Date, withTrend: boolean) {
  const [expenses, income, categoryGroups] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "desc" } }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);

  const byCategory = categoryGroups
    .map((g) => ({ category: g.category, amount: g._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Optional month-by-month breakdown (used by yearly reports).
  let monthly: { month: string; label: string; expense: number; income: number }[] = [];
  if (withTrend) {
    const map = new Map<string, { expense: number; income: number }>();
    for (let m = 0; m < 12; m++) {
      const key = toMonthKey(new Date(start.getFullYear(), m, 1));
      map.set(key, { expense: 0, income: 0 });
    }
    for (const e of expenses) {
      const c = map.get(toMonthKey(e.date));
      if (c) c.expense += e.amount;
    }
    for (const i of income) {
      const c = map.get(toMonthKey(i.date));
      if (c) c.income += i.amount;
    }
    monthly = Array.from(map.entries()).map(([key, v]) => ({ month: key, label: monthLabel(key), ...v }));
  }

  return {
    type,
    period,
    totals: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense },
    byCategory,
    monthly,
    expenses,
    income,
  };
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export default router;
