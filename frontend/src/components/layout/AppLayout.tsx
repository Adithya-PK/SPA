import { Outlet } from "react-router-dom";
import { TopNavigation } from "./TopNavigation";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-64">
        <TopNavigation />
        <main className="min-h-screen px-4 py-5 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
