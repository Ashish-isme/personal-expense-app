import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { api, NOTIFICATIONS_CHANGED_EVENT } from "@/lib/api";
import type { Notification, NotificationFeed } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Poll interval for the unread badge. Cheap query, and keeps the bell live. */
const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Strips the HTML the month-end summary uses, so the list stays plain text. */
function toPlainText(html: string): string {
  return html
    .replace(/<li>/g, "• ")
    .replace(/<\/li>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const isBudgetAlert = (n: Notification) => n.type === "budget_warning" || n.type === "budget_exceeded";

export function NotificationBell() {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [open, setOpen] = useState(false);
  // Ids already seen, so only budget alerts that arrive while the app is open pop up as toasts.
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(() => {
    api
      .get<NotificationFeed>("/api/notifications")
      .then((next) => {
        if (seen.current) {
          for (const n of next.items) {
            if (!n.read && !seen.current.has(n.id) && isBudgetAlert(n)) {
              const show = n.type === "budget_exceeded" ? toast.error : toast.warning;
              show(n.title, { description: n.body });
            }
          }
        }
        seen.current = new Set(next.items.map((n) => n.id));
        setFeed(next);
      })
      .catch(() => {
        /* a failed poll shouldn't surface an error in the chrome */
      });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    // Refresh straight away after actions that can raise alerts (e.g. adding an expense).
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    return () => {
      clearInterval(t);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    };
  }, [load]);

  const markAllRead = async () => {
    await api.post("/api/notifications/read-all", {});
    load();
  };

  const unread = feed?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `${unread} unread notifications` : "Notifications"}>
          <Bell />
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={markAllRead} className="text-muted-foreground">
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        {feed && feed.items.length ? (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {feed.items.map((n) => (
                <li key={n.id} className={cn("px-4 py-3", !n.read && "bg-accent/40")}>
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : n.type === "budget_exceeded" ? "bg-destructive" : n.type === "budget_warning" ? "bg-warning" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs whitespace-pre-line">{toPlainText(n.body)}</p>
                      <p className="text-muted-foreground/70 mt-1 text-[11px]">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">You're all caught up.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
