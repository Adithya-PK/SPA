import { FileText, LayoutDashboard, Settings, Upload } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Upload", path: "/upload", icon: Upload },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="border-b bg-card px-4 py-4 md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 md:mb-8">
        <img src="/college_logo.png" alt="Easwari Engineering College logo" className="h-11 w-11 rounded-full object-contain" />
        <div>
          <p className="text-sm font-semibold">Easwari Engineering College</p>
          <p className="text-xs text-muted-foreground">Student Performance Analyzer</p>
        </div>
      </div>

      <nav className="mt-4 flex gap-2 overflow-x-auto md:mt-0 md:flex-col md:overflow-visible">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
