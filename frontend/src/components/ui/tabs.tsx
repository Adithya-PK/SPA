import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Tabs({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex w-full gap-2 rounded-lg bg-muted p-1 sm:w-fit", className)}>{children}</div>;
}

export function TabsTrigger({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 flex-1 rounded-md px-4 text-sm font-medium transition-colors sm:flex-none",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
