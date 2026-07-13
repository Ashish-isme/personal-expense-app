import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  HandCoins,
  FileBarChart,
  Repeat,
  LogOut,
  X,
} from "lucide-react";
import { cx } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/income", label: "Income", icon: Wallet },
  { to: "/budget", label: "Budget", icon: PiggyBank },
  { to: "/debts", label: "Money Owed", icon: HandCoins },
  { to: "/recurring", label: "Recurring", icon: Repeat },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Left navigation. Fixed on desktop, slide-over drawer on mobile. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform dark:border-neutral-800 dark:bg-surface-card lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
              <PiggyBank size={16} />
            </span>
            <span className="font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
              Finance
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold uppercase text-brand">
              {(user?.name || user?.email || "?").charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                {user?.name || "Account"}
              </p>
              <p className="truncate text-xs text-neutral-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
