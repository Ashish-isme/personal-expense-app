import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppSidebar, pageTitle } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { usePageEnter } from "@/lib/motion";

/** App shell: sidebar + top bar + routed page content. */
export function Layout() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  // Materialize any due recurring transactions once when the app shell loads,
  // so the dashboard and lists reflect them without visiting the Recurring page.
  useEffect(() => {
    api.post("/api/recurring/run", {}).catch(() => {
      /* non-critical — the Recurring page has a manual "Run now" fallback */
    });
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <span className="text-sm font-medium">{pageTitle(pathname)}</span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <Page key={pathname} />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * The routed page. Mounted fresh per route (keyed by path) and only once its
 * code has loaded, so the entrance animation always has the real content.
 */
function Page() {
  const ref = usePageEnter<HTMLDivElement>(null);
  return (
    <div ref={ref} className="space-y-6">
      <Outlet />
    </div>
  );
}
