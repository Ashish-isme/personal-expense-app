import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Income } from "./pages/Income";
import { Budget } from "./pages/Budget";
import { Debts } from "./pages/Debts";
import { Reports } from "./pages/Reports";

/** Top-level routing. All pages render inside the shared Layout shell. */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="income" element={<Income />} />
        <Route path="budget" element={<Budget />} />
        <Route path="debts" element={<Debts />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}
