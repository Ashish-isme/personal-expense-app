import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/** Friendly placeholder shown when a list or chart has no data yet. */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-neutral-400 dark:text-neutral-500">{description}</p>}
    </div>
  );
}
