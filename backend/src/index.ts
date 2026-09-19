import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

import authRouter from "./routes/auth.js";
import expensesRouter from "./routes/expenses.js";
import incomeRouter from "./routes/income.js";
import budgetsRouter from "./routes/budgets.js";
import debtsRouter from "./routes/debts.js";
import recurringRouter from "./routes/recurring.js";
import groupsRouter from "./routes/groups.js";
import notificationsRouter, { monthlySummaryHandler } from "./routes/notifications.js";
import dashboardRouter from "./routes/dashboard.js";
import reportsRouter from "./routes/reports.js";
import { requireAuth } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";

const app = express();

// ---- Middleware --------------------------------------------------------------
const origins = (process.env.CORS_ORIGIN || "*").split(",").map((o) => o.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json());

// ---- Health check (used by Render) -------------------------------------------
app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ---- Warm-up (called by the login screen) ------------------------------------
// Touches the database so an idle Postgres starts waking while the user is still
// typing their password. Kept separate from /api/health, which Render polls
// constantly and so must not keep the database awake.
app.get("/api/warmup", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ error: "Database is not reachable yet" });
  }
});

// ---- Public auth routes ------------------------------------------------------
app.use("/api/auth", authRouter);

// ---- Cron endpoint (no session; guarded by the CRON_SECRET header) ------------
app.post("/api/cron/monthly-summary", monthlySummaryHandler);

// ---- Feature routes (all require a valid session) ----------------------------
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/income", requireAuth, incomeRouter);
app.use("/api/budgets", requireAuth, budgetsRouter);
app.use("/api/debts", requireAuth, debtsRouter);
app.use("/api/recurring", requireAuth, recurringRouter);
app.use("/api/groups", requireAuth, groupsRouter);
app.use("/api/notifications", requireAuth, notificationsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/reports", requireAuth, reportsRouter);

// ---- 404 + central error handler ---------------------------------------------
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🟢 Finance Tracker API listening on http://localhost:${PORT}`);
  // Open the database connection now rather than on the first request.
  prisma.$connect().catch((err) => console.error("Initial database connection failed:", err));
});
