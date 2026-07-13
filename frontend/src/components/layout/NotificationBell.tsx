import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { NotificationFeed } from "../../lib/types";
import { cx } from "../../lib/utils";

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

/** Strips the HTML the month-end summary uses, so the dropdown stays plain text. */
function toPlainText(html: string): string {
  return html
    .replace(/<li>/g, "• ")
    .replace(/<\/li>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function NotificationBell() {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    api
      .get<NotificationFeed>("/api/notifications")
      .then(setFeed)
      .catch(() => {
        /* a failed poll shouldn't surface an error in the chrome */
      });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    await api.post("/api/notifications/read-all", {});
    load();
  };

  const unread = feed?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-neutral-300 p-2 text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-surface-card">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-brand"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {feed && feed.items.length ? (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {feed.items.map((n) => (
                  <li
                    key={n.id}
                    className={cx("px-3 py-2.5", !n.read && "bg-brand/5")}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                      <div className={cx("min-w-0", n.read && "pl-3.5")}>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{n.title}</p>
                        <p className="mt-0.5 whitespace-pre-line text-xs text-neutral-500 dark:text-neutral-400">
                          {toPlainText(n.body)}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-400">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-8 text-center text-sm text-neutral-400">Nothing here yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
