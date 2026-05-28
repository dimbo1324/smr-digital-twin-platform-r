import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar/AppSidebar";
import { Topbar } from "@/widgets/topbar/Topbar";

export function AppLayout() {
  return (
    <div className="app-background h-screen overflow-hidden select-none text-foreground transition-colors duration-500" data-testid="app-shell">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-panel focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <div className="h-screen min-h-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <Topbar />
          <main
            id="main-content"
            tabIndex={0}
            className="mx-auto flex min-h-0 w-full max-w-[1520px] flex-1 flex-col overflow-y-auto p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 lg:p-5 xl:p-6"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
