# 💰 Personal Finance Tracker

A modern, single-user personal finance tracker with a clean **Notion / Linear‑inspired** UI, full dark mode, and rich reporting. No login required — just run it and start tracking.

![Dashboard](https://img.shields.io/badge/status-production--ready-5b5bd6) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Dashboard** — Monthly income, budget, expenses, remaining budget, savings, money to receive/pay, and net worth, plus a **Spending by Category** donut, a **Monthly Trend** chart, and recent transactions.
- **Expenses** — Full add / edit / delete with date, category, description, amount, payment method (Cash · Bank · eSewa · Khalti) and notes.
- **Income** — Track salary and other income sources.
- **Budget** — Per-category monthly budgets with progress bars, % used, actual vs. remaining.
- **Money Owed** — Track what you owe and what others owe you, with due dates and settle/unsettle.
- **Reports** — Monthly, yearly and category reports with **CSV** and **Excel** export.
- **Dark mode**, fully **responsive**, keyboard-accessible modals.

## 🧱 Tech Stack

| Layer     | Tech                                                     |
| --------- | ------------------------------------------------------- |
| Frontend  | React + TypeScript + Tailwind CSS + Recharts + Lucide   |
| Backend   | Node.js + Express                                       |
| Database  | SQLite via Prisma ORM                                    |
| Tooling   | Bun (package manager), Vite                              |

## 📁 Project Structure

```
PersonalExpenseApp/
├── backend/                 # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma     # DB models (Expense, Income, Budget, Debt)
│   │   └── seed.ts           # Sample data
│   └── src/
│       ├── index.ts          # Server entry + middleware
│       ├── lib/              # prisma client, dates, validation (Zod)
│       └── routes/           # expenses, income, budgets, debts, dashboard, reports
├── frontend/                # React + Vite app
│   └── src/
│       ├── components/       # ui/, layout/, charts/ (reusable)
│       ├── context/          # ThemeContext (dark mode)
│       ├── lib/              # api client, types, utils, hooks
│       └── pages/            # Dashboard, Expenses, Income, Budget, Debts, Reports
├── render.yaml              # One-click Render backend deploy
└── README.md
```

## 🚀 Getting Started (Local)

> Requires [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`). Node 18+ also works.

### 1. Backend

```bash
cd backend
cp .env.example .env        # default uses a local SQLite file
bun install
bun run db:push             # create the SQLite schema
bun run seed                # (optional) load sample data
bun run dev                 # → http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
bun install
bun run dev                 # → http://localhost:5173
```

The Vite dev server proxies `/api` to the backend on port 4000, so no extra config is needed. If your backend runs on a different port, set `VITE_PROXY_TARGET`.

## ☁️ Deployment

The frontend deploys to **Vercel** and the backend to **Render** (with a persistent disk for the SQLite database).

### Backend → Render

1. Push this repo to GitHub.
2. In Render: **New + → Blueprint** and select the repo. The included `render.yaml` provisions a web service with a **1 GB persistent disk** mounted at `/var/data`, so the database survives restarts and redeploys.
3. After it deploys, set the `CORS_ORIGIN` env var to your Vercel URL (e.g. `https://your-app.vercel.app`).

> Prefer manual setup? Create a Web Service with **Root Directory** `backend`, build `npm install && npx prisma generate`, start `npx prisma db push --skip-generate && npm start`, add a disk at `/var/data`, and set `DATABASE_URL=file:/var/data/finance.db`.

### Frontend → Vercel

1. In Vercel: **Add New → Project**, import the repo, set **Root Directory** to `frontend`.
2. Add an environment variable `VITE_API_URL` = your Render backend URL (e.g. `https://finance-tracker-api.onrender.com`).
3. Deploy. Vercel auto-detects Vite (build `vite build`, output `dist`). `vercel.json` handles SPA routing.

## 🔌 API Reference

Base URL: `/api`

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/dashboard?month=YYYY-MM`   | All dashboard metrics + chart data       |
| GET/POST/PUT/DELETE | `/expenses`     | Expense CRUD (`?month`, `?category`)     |
| GET/POST/PUT/DELETE | `/income`       | Income CRUD (`?month`)                   |
| GET/POST/PUT/DELETE | `/budgets`      | Budget CRUD with actual/remaining/%      |
| GET/POST/PUT/DELETE | `/debts`        | Money-owed CRUD (`?direction`, `?status`)|
| PATCH  | `/debts/:id/toggle`          | Flip pending ↔ settled                    |
| GET    | `/reports?type=&period=`     | Monthly / yearly / category report       |
| GET    | `/reports/export.csv`        | CSV export                               |
| GET    | `/reports/export.xlsx`       | Excel export                             |
| GET    | `/health`                    | Health check                             |

## 🎨 Customization

- **Currency** — edit `formatCurrency` in `frontend/src/lib/utils.ts` (defaults to `Rs`).
- **Categories** — edit `EXPENSE_CATEGORIES` in the same file.
- **Colors / theme** — `frontend/tailwind.config.js`.

## 📝 License

MIT — free to use and modify.
