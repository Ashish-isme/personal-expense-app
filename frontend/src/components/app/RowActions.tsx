import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
}

/** "⋯" menu for a list row. Always visible, so it works on touch screens. */
export function RowActions({ actions, label = "Actions" }: { actions: RowAction[]; label?: string }) {
  const normal = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={label}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {normal.map(({ label, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={label} onSelect={onSelect}>
            {Icon && <Icon />} {label}
          </DropdownMenuItem>
        ))}
        {normal.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map(({ label, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={label} variant="destructive" onSelect={onSelect}>
            {Icon && <Icon />} {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
