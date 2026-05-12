import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar/AppSidebar";
import { Topbar } from "@/widgets/topbar/Topbar";

export function AppLayout() {
  return (
    <div className="app-background min-h-screen text-foreground transition-colors duration-500">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="min-w-0">
          <Topbar />
          <main className="mx-auto flex w-full max-w-[1520px] flex-col gap-7 p-4 sm:p-6 lg:p-8 xl:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
