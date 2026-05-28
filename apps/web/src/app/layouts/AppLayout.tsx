import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar/AppSidebar";
import { Topbar } from "@/widgets/topbar/Topbar";

export function AppLayout() {
  return (
    <div className="app-background min-h-screen select-none text-foreground transition-colors duration-500" data-testid="app-shell">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-panel focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="min-w-0">
          <Topbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-[1520px] flex-col gap-7 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 lg:p-8 xl:p-10"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
