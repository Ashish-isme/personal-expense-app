import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Income } from "./pages/Income";
import { Budget } from "./pages/Budget";
import { Debts } from "./pages/Debts";
import { Reports } from "./pages/Reports";
import { Recurring } from "./pages/Recurring";
import { Groups } from "./pages/Groups";
import { GroupDetail } from "./pages/GroupDetail";
import { Login } from "./pages/Login";
import { useAuth } from "./context/AuthContext";

/**
 * Top-level routing. Until a session is confirmed we show a splash; unauthenticated
 * users see the login screen, everyone else gets the app shell.
 */
export function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        Loading…
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
