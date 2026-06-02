import type { RefObject } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, Menu, PanelLeft, RadioTower, ShieldAlert } from "lucide-react";
import { DemoRoleSwitcher } from "@/features/demo-auth/DemoRoleSwitcher";
import { navigationItems } from "@/shared/config/navigation";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export interface TopbarProps {
  onOpenNavigation: () => void;
  navigationOpen: boolean;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  mobileMenuButtonRef?: RefObject<HTMLButtonElement>;
}

export function Topbar({
  onOpenNavigation,
  navigationOpen,
  sidebarExpanded,
  onToggleSidebar,
  mobileMenuButtonRef,
}: TopbarProps) {
  const location = useLocation();
  const systemStatus = useSystemStatus();
  const pageMeta =
    navigationItems.find((item) => location.pathname.startsWith(item.path)) ?? navigationItems[0];

  const statusValue =
    systemStatus.state === "connected"
      ? (systemStatus.status.simulationHealth ??
        systemStatus.status.simulationService?.status ??
        "connected")
      : systemStatus.state;
  const statusTone = systemStatus.state === "connected" ? "healthy" : "degraded";
  const lastSync =
    systemStatus.state === "connected"
      ? new Date(systemStatus.status.timestamp).toLocaleTimeString()
      : "Waiting";

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/70 bg-background/88 px-3 py-2 shadow-[0_10px_28px_hsl(var(--background)/0.35)] backdrop-blur-xl sm:px-4 lg:px-5"
      data-testid="app-topbar"
    >
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 items-center gap-2">
        <Button
          ref={mobileMenuButtonRef}
          type="button"
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={onOpenNavigation}
          aria-label="Open navigation drawer"
          aria-expanded={navigationOpen}
          aria-controls="mobile-navigation-drawer"
          data-testid="mobile-navigation-toggle"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label={sidebarExpanded ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
          aria-pressed={!sidebarExpanded}
          data-testid="topbar-sidebar-toggle"
        >
          <PanelLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary sm:inline-flex">
              HMI shell
            </span>
            <h1 className="truncate text-[var(--font-size-lg)] font-semibold leading-tight text-foreground">
              {pageMeta.title}
            </h1>
          </div>
          <p className="hidden truncate text-[var(--font-size-xs)] leading-normal text-muted-foreground md:block">
            {pageMeta.description}
          </p>
        </div>

        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <StatusBadge value={statusValue} tone={statusTone} />
          <StatusBadge value="Simulation-only" tone="simulation" />
        </div>

        <div className="hidden min-w-0 lg:block">
          <DemoRoleSwitcher />
        </div>

        <ThemeToggle />

        <details className="group relative">
          <summary
            className={cn(
              "inline-flex h-[var(--app-control-height-md)] cursor-pointer list-none items-center justify-center gap-1 rounded-md border border-border/80 bg-card/70 px-2 text-[var(--font-size-xs)] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "[&::-webkit-details-marker]:hidden",
            )}
            aria-label="Open platform status summary"
          >
            <RadioTower className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Status</span>
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1rem))] rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-panel">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={statusValue} tone={statusTone} />
                <StatusBadge value="Simulation-only" tone="simulation" />
                <StatusBadge value="MQTT publish-only" tone="neutral" />
              </div>
              <div className="rounded-lg border border-warning/25 bg-warning/10 p-2 text-[var(--font-size-xs)] leading-normal text-muted-foreground">
                <div className="flex items-start gap-2">
                  <ShieldAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <span>
                    Synthetic telemetry only. No PLC/SCADA connectivity, production audit, or
                    regulatory reporting.
                  </span>
                </div>
              </div>
              <div className="text-[var(--font-size-xs)] text-muted-foreground">
                Last status refresh: <span className="font-medium text-foreground">{lastSync}</span>
              </div>
              <div className="lg:hidden">
                <DemoRoleSwitcher
                  idSuffix="overflow"
                  testId="auth-user-switcher-overflow"
                  currentUserTestId="auth-current-user-overflow"
                  currentRoleTestId="auth-current-role-overflow"
                />
              </div>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
