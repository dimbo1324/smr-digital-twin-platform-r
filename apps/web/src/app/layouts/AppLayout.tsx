import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar/AppSidebar";
import { useSidebarState } from "@/widgets/app-sidebar/useSidebarState";
import { Topbar } from "@/widgets/topbar/Topbar";
import { cn } from "@/shared/lib/cn";

export function AppLayout() {
  const sidebar = useSidebarState();
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const desktopExpanded = sidebar.pinned || !sidebar.collapsed || hoverExpanded;

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) {
      const closeButton = document.querySelector<HTMLButtonElement>(
        '[data-testid="mobile-navigation-close"]',
      );
      closeButton?.focus();
    }
  }, [drawerOpen]);

  return (
    <div
      className="app-background min-h-screen overflow-x-hidden text-foreground"
      data-testid="app-shell"
    >
      <a
        href="#main-content"
        className="sr-only z-[80] rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-focus-ring"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen min-w-0">
        <div
          className={cn(
            "relative z-40 hidden shrink-0 lg:block",
            desktopExpanded ? "w-[18rem]" : "w-[5.25rem]",
          )}
          data-testid="desktop-sidebar-region"
        >
          <AppSidebar
            expanded={desktopExpanded}
            pinned={sidebar.pinned}
            onCollapseToggle={sidebar.toggleCollapsed}
            onPinToggle={sidebar.togglePinned}
            onMouseEnter={() => setHoverExpanded(true)}
            onMouseLeave={() => setHoverExpanded(false)}
          />
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            onOpenNavigation={() => setDrawerOpen(true)}
            navigationOpen={drawerOpen}
            sidebarExpanded={desktopExpanded}
            onToggleSidebar={sidebar.toggleCollapsed}
            mobileMenuButtonRef={mobileMenuButtonRef}
          />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col px-3 py-4 outline-none sm:px-4 lg:px-5 xl:px-6"
          >
            <Outlet />
          </main>
        </div>
      </div>

      {drawerOpen ? (
        <div
          id="mobile-navigation-drawer"
          className="fixed inset-0 z-[70] lg:hidden"
          data-testid="mobile-navigation-drawer"
        >
          <button
            type="button"
            aria-label="Close navigation drawer backdrop"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => {
              setDrawerOpen(false);
              mobileMenuButtonRef.current?.focus();
            }}
          />
          <div className="relative h-full max-w-[22rem] outline-none">
            <AppSidebar
              mode="drawer"
              expanded
              onClose={() => {
                setDrawerOpen(false);
                mobileMenuButtonRef.current?.focus();
              }}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
