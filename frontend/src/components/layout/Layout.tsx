import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../lib/api";

/** App shell: sidebar + top bar + routed page content. */
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  // Materialize any due recurring transactions once when the app shell loads,
  // so the dashboard and lists reflect them without visiting the Recurring page.
  useEffect(() => {
    api.post("/api/recurring/run", {}).catch(() => {
      /* non-critical — the Recurring page has a manual "Run now" fallback */
    });
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-200 bg-surface-subtle/80 px-4 backdrop-blur dark:border-neutral-800 dark:bg-surface-dark/80">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={toggle}
              className="rounded-lg border border-neutral-300 p-2 text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
