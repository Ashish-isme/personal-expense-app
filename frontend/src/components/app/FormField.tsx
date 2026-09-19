import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control (+ optional hint) with consistent spacing. */
export function FormField({ label, htmlFor, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-muted-foreground text-xs font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

/** Error line shown under a form. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}
