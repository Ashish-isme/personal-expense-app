# 💰 Personal Finance Tracker

A modern personal finance tracker with a clean **Notion / Linear‑inspired** UI, full dark mode, and rich reporting. Sign up, log in, and every account's data is fully isolated.

![Dashboard](https://img.shields.io/badge/status-production--ready-5b5bd6) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Accounts** — Email + password sign-up / sign-in with JWT sessions (bcrypt-hashed passwords). All data is scoped per user.
- **Dashboard** — Monthly income, budget, expenses, remaining budget, savings, money to receive/pay, and net worth, plus a **Spending by Category** donut, a **Monthly Trend** chart, and recent transactions.
- **Expenses** — Full add / edit / delete with date, category, description, amount, payment method (Cash · Bank · eSewa · Khalti) and notes. **Search & filter** by text, category and amount range.
- **Income** — Track salary and other income sources.
- **Budget** — Per-category monthly budgets with progress bars, % used, actual vs. remaining, plus **overspend alerts** ("Near limit" at 80%, "Over budget" past 100%) surfaced on both the Budget page and the Dashboard.
- **Recurring** — Rules for transactions that repeat (rent, salary, subscriptions) on a weekly or monthly schedule. Due occurrences are generated automatically when the app loads, or on demand with **Run now**. Rules can be paused and resumed.
- **Money Owed** — Track what you owe and what others owe you, with due dates and settle/unsettle.
- **Groups** — Split expenses with friends. Create a group, share the invite code, and record who paid what. Splits can be **equal**, **exact amounts**, or **percentages**. The app works out who owes who and reduces it to the fewest payments. Settling up is two-sided: the payer marks it paid, and it only counts once the recipient **confirms they received it**.
- **Notifications** — In-app bell for group activity (expenses added, payments claimed and confirmed), plus a **month-end settle-up summary** delivered in-app and by **email**.
- **Reports** — Monthly, yearly and category reports with **CSV** and **Excel** export.
- **Dark mode**, fully **responsive**, keyboard-accessible modals.

## 🧱 Tech Stack

| Layer     | Tech                                                     |
| --------- | ------------------------------------------------------- |
| Frontend  | React + TypeScript + Tailwind CSS + Recharts + Lucide   |
| Backend   | Node.js + Express                                       |
| Database  | PostgreSQL via Prisma ORM                                |
| Email     | Nodemailer (SMTP, optional)                              |
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
> You'll also need a Postgres to point at — the one-liner below runs one in Docker.

### 1. Database

```bash
docker run -d --name ft-pg \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=finance \
  -p 55432:5432 postgres:16-alpine
```

(Already have Postgres, or want to use a Neon database? Just set `DATABASE_URL` to it and skip this.)

### 2. Backend

```bash
cd backend
cp .env.example .env        # defaults to the Docker Postgres above
bun install
bun run db:push             # create the schema
bun run seed                # (optional) load sample data + demo account
bun run dev                 # → http://localhost:4000
```

> The seed creates a demo account you can sign in with: **demo@finance.app** / **demo1234**.
> Otherwise just hit **Sign up** on the login screen to create your own.

### 3. Frontend

```bash
cd frontend
bun install
bun run dev                 # → http://localhost:5173
```

The Vite dev server proxies `/api` to the backend on port 4000, so no extra config is needed. If your backend runs on a different port, set `VITE_PROXY_TARGET`.

## ☁️ Deployment

Database on **Neon** (managed Postgres), backend on **Render**, frontend on **Vercel**. All three have free tiers that comfortably run this app.

> **Why not SQLite on Render?** Render's free instances have an ephemeral filesystem and don't support persistent disks — a SQLite file would be destroyed on every restart, redeploy and spin-down, taking every account and balance with it. Keeping the data in a managed Postgres means the web service can be wiped and restarted freely without losing anything.

### 1. Database → Neon

1. Create a free project at **[neon.tech](https://neon.tech)**.
2. Copy the connection string (it looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).

### 2. Backend → Render

1. Push this repo to GitHub.
2. In Render: **New + → Blueprint** and select the repo. `render.yaml` provisions the web service and auto-generates `JWT_SECRET` and `CRON_SECRET`.
3. Set **`DATABASE_URL`** to your Neon connection string.
4. Once the frontend is up, set **`CORS_ORIGIN`** to your Vercel URL (it defaults to `*`, i.e. open to any origin).

The start command runs `prisma db push`, so the schema is created on the Neon database automatically on first deploy.

> Prefer the manual form over a Blueprint? Create a **Web Service** with **Root Directory** `backend`, build `npm install && npx prisma generate`, start `npx prisma db push --skip-generate && npm start`, and set `DATABASE_URL`, a long random `JWT_SECRET`, and `CORS_ORIGIN`. Without `JWT_SECRET` the API falls back to an insecure default and logs a warning.

### 3. Frontend → Vercel

1. In Vercel: **Add New → Project**, import the repo, set **Root Directory** to `frontend`.
2. Add an environment variable `VITE_API_URL` = your Render backend URL (e.g. `https://finance-tracker-api.onrender.com`).
3. Deploy. Vercel auto-detects Vite (build `vite build`, output `dist`). `vercel.json` handles SPA routing.

> Render's free instances sleep after ~15 minutes of inactivity, so the first request after a lull takes ~30–50s while the service wakes. The data itself is safe on Neon regardless.

## 🔌 API Reference

Base URL: `/api`

Every endpoint except `/auth/*` and `/health` requires an `Authorization: Bearer <token>` header. File-download endpoints also accept `?token=` since a browser download can't set headers.

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| POST   | `/auth/register`             | Create an account → `{ token, user }`    |
| POST   | `/auth/login`                | Sign in → `{ token, user }`              |
| GET    | `/auth/me`                   | Current user for a token                 |
| GET    | `/dashboard?month=YYYY-MM`   | All dashboard metrics + chart data       |
| GET/POST/PUT/DELETE | `/expenses`     | Expense CRUD (`?month`, `?category`, `?search`, `?minAmount`, `?maxAmount`, `?from`, `?to`) |
| GET/POST/PUT/DELETE | `/income`       | Income CRUD (`?month`)                   |
| GET/POST/PUT/DELETE | `/budgets`      | Budget CRUD with actual/remaining/%      |
| GET/POST/PUT/DELETE | `/debts`        | Money-owed CRUD (`?direction`, `?status`)|
| PATCH  | `/debts/:id/toggle`          | Flip pending ↔ settled                    |
| GET/POST/PUT/DELETE | `/recurring`    | Recurring-rule CRUD                      |
| PATCH  | `/recurring/:id/toggle`      | Pause ↔ resume a rule                     |
| POST   | `/recurring/run`             | Generate any due occurrences (idempotent)|
| GET/POST | `/groups`                  | List your groups (with net balance) / create |
| POST   | `/groups/join`               | Join a group with an invite code         |
| GET/DELETE | `/groups/:id`            | Group detail (members, balances, transfers, expenses) |
| POST   | `/groups/:id/leave`          | Leave a group (blocked unless settled up)|
| POST/DELETE | `/groups/:id/expenses`  | Add / remove a shared expense            |
| POST   | `/groups/:id/settlements`    | Claim a repayment ("I paid you")         |
| PATCH  | `/groups/:gid/settlements/:sid` | Recipient confirms or declines it     |
| GET    | `/notifications`             | Your notifications + unread count        |
| PATCH  | `/notifications/:id/read`    | Mark one read                            |
| POST   | `/notifications/read-all`    | Mark all read                            |
| POST   | `/cron/monthly-summary`      | Send month-end summaries (needs `x-cron-secret`) |
| GET    | `/reports?type=&period=`     | Monthly / yearly / category report       |
| GET    | `/reports/export.csv`        | CSV export                               |
| GET    | `/reports/export.xlsx`       | Excel export                             |
| GET    | `/health`                    | Health check                             |

## 👥 How groups work

1. **Create a group** and share its invite code (e.g. `K3M9PQ7X`) with your friends.
2. **Anyone records an expense** — who paid, how much, and who it's split between. Splits can be equal, exact amounts, or percentages; the app validates that the shares reconcile against the total to the cent.
3. **Balances are computed automatically.** The app nets everything out and shows the fewest payments needed to settle up ("You owe Ram Rs 500").
4. **Settling up is two-sided.** The person who owes taps *Mark as paid*; the recipient gets a notification and must tap *Received* to confirm. Balances only move on confirmation — nobody can clear their own debt unilaterally.

## 📧 Month-end summary emails (optional)

At month end, every member with an outstanding balance gets a settle-up summary. It always lands **in-app**; email is sent too if SMTP is configured.

**1. Enable email** — set these on the backend (Render dashboard, or `backend/.env` locally). For Gmail, generate an [App Password](https://myaccount.google.com/apppasswords) — your normal Google password will not work:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="Finance Tracker <you@gmail.com>"
```

Leave them unset and nothing breaks — email is simply skipped.

**2. Schedule it** — the summary is triggered by `POST /api/cron/monthly-summary`, protected by the `CRON_SECRET` env var (auto-generated by `render.yaml`). Point any external scheduler at it, e.g. a free [cron-job.org](https://cron-job.org) job running on the 1st of each month:

```
POST https://your-api.onrender.com/api/cron/monthly-summary
Header: x-cron-secret: <your CRON_SECRET>
```

> Why an external cron rather than an in-process one? Render's free tier puts the service to sleep after ~15 minutes of inactivity, so a timer running inside the server can't be relied on to fire on the last day of the month. An external ping wakes the service and runs the job.

## 🎨 Customization

- **Currency** — edit `formatCurrency` in `frontend/src/lib/utils.ts` (defaults to `Rs`).
- **Categories** — edit `EXPENSE_CATEGORIES` in the same file.
- **Colors / theme** — `frontend/tailwind.config.js`.

## 📝 License

MIT — free to use and modify.
