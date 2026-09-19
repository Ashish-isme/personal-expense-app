import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Login } from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import { Loader2, PiggyBank } from "lucide-react";
import { Button } from "./components/ui/button";
import { useSlowHint } from "./lib/useSlowHint";

// Each page is its own chunk, so signing in doesn't download charts etc. up front.
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const Dashboard = page(() => import("./pages/Dashboard"), "Dashboard");
const Expenses = page(() => import("./pages/Expenses"), "Expenses");
const Income = page(() => import("./pages/Income"), "Income");
const Budget = page(() => import("./pages/Budget"), "Budget");
const Forecast = page(() => import("./pages/Forecast"), "Forecast");
const Debts = page(() => import("./pages/Debts"), "Debts");
const Groups = page(() => import("./pages/Groups"), "Groups");
const GroupDetail = page(() => import("./pages/GroupDetail"), "GroupDetail");
const Recurring = page(() => import("./pages/Recurring"), "Recurring");
const Reports = page(() => import("./pages/Reports"), "Reports");

/**
 * Top-level routing. Until a session is confirmed we show a splash; unauthenticated
 * users see the login screen, everyone else gets the app shell.
 */
export function App() {
  const { user, initializing, sessionError, retrySession } = useAuth();
  const slow = useSlowHint(initializing);

  if (initializing) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
          <PiggyBank className="size-5" />
        </span>
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
        {slow && (
          <p className="text-muted-foreground max-w-xs text-sm">
            The server was asleep and is starting up. This can take up to a minute.
          </p>
        )}
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground text-sm">{sessionError}</p>
        <Button onClick={retrySession}>Try again</Button>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="income" element={<Income />} />
        <Route path="budget" element={<Budget />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="debts" element={<Debts />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="recurring" element={<Recurring />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
