import { CalendarDays } from "lucide-react";

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Easwari Engineering College</p>
          <p className="text-xs text-muted-foreground">Department of Artificial Intelligence and Data Science</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>Academic setup required before uploads</span>
        </div>
      </div>
    </header>
  );
}
