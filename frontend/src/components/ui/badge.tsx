import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "muted" | "danger";

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-red-100 text-red-800",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
