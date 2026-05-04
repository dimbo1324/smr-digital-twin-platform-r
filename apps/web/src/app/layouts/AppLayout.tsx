import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar/AppSidebar";
import { Topbar } from "@/widgets/topbar/Topbar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="min-w-0">
          <Topbar />
          <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
