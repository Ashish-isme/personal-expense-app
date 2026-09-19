import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Income } from "./pages/Income";
import { Budget } from "./pages/Budget";
import { Debts } from "./pages/Debts";
import { Reports } from "./pages/Reports";
import { Forecast } from "./pages/Forecast";
import { Recurring } from "./pages/Recurring";
import { Groups } from "./pages/Groups";
import { GroupDetail } from "./pages/GroupDetail";
import { Login } from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import { Button } from "./components/ui/Button";
import { useSlowHint } from "./lib/useSlowHint";

/**
 * Top-level routing. Until a session is confirmed we show a splash; unauthenticated
 * users see the login screen, everyone else gets the app shell.
 */
export function App() {
  const { user, initializing, sessionError, retrySession } = useAuth();
  const slow = useSlowHint(initializing);

  if (initializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-1 px-4 text-center text-sm text-neutral-400">
        <p>Loading…</p>
        {slow && <p>The server was asleep and is starting up. This can take up to a minute.</p>}
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center text-sm text-neutral-400">
        <p>{sessionError}</p>
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
