import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  LockKeyhole,
  PanelLeft,
  Pin,
  PinOff,
  Radio,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { navigationItems } from "@/shared/config/navigation";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";

export interface AppSidebarProps {
  expanded: boolean;
  mode?: "desktop" | "drawer";
  pinned?: boolean;
  onCollapseToggle?: () => void;
  onPinToggle?: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function AppSidebar({
  expanded,
  mode = "desktop",
  pinned = false,
  onCollapseToggle,
  onPinToggle,
  onNavigate,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: AppSidebarProps) {
  const systemStatus = useSystemStatus();
  const isDrawer = mode === "drawer";
  const isConnected = systemStatus.state === "connected";
  const statusLabel = isConnected
    ? (systemStatus.status.simulationHealth ??
      systemStatus.status.simulationService?.status ??
      "connected")
    : systemStatus.state;
  const environment = isConnected ? systemStatus.status.environment : "local demo";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-border/70 bg-surface-raised/95 text-sidebar-foreground shadow-[0_18px_48px_hsl(var(--foreground)/0.12)] backdrop-blur-xl",
        isDrawer
          ? "w-full max-w-[22rem] rounded-r-2xl border-r"
          : "sticky top-0 h-screen overflow-hidden border-r transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        !isDrawer && (expanded ? "w-[18rem]" : "w-[5.25rem]"),
      )}
      data-testid="app-sidebar"
      data-expanded={expanded ? "true" : "false"}
      data-mode={mode}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div
          className={cn(
            "rounded-xl border border-border/70 bg-card/70 p-2 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]",
            expanded ? "space-y-3" : "space-y-2",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className={cn("min-w-0", expanded ? "block" : "sr-only")}>
              <p className="truncate text-[var(--font-size-sm)] font-semibold text-foreground">
                SMR Twin
              </p>
              <p className="truncate text-[var(--font-size-xs)] text-muted-foreground">
                Industrial demo HMI
              </p>
            </div>
            {isDrawer ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={onClose}
                aria-label="Close navigation drawer"
                data-testid="mobile-navigation-close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <div className={cn("flex items-center gap-2", expanded ? "justify-between" : "hidden")}>
            <StatusBadge value={statusLabel} tone={isConnected ? "healthy" : "degraded"} />
            <Badge variant="simulation" className="truncate">
              {environment}
            </Badge>
          </div>
        </div>

        {!isDrawer ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCollapseToggle}
              aria-label={expanded ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
              aria-pressed={!expanded}
              title={expanded ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
              data-testid="sidebar-toggle"
            >
              {expanded ? (
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            {expanded ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPinToggle}
                aria-label={pinned ? "Unpin expanded navigation" : "Pin expanded navigation"}
                aria-pressed={pinned}
                title={pinned ? "Unpin expanded navigation" : "Pin expanded navigation"}
                data-testid="sidebar-pin-toggle"
              >
                {pinned ? (
                  <PinOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Pin className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            ) : null}
          </div>
        ) : null}

        <nav
          aria-label={isDrawer ? "Mobile primary navigation" : "Primary navigation"}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5"
          data-testid="primary-navigation"
        >
          <ul className="flex flex-col gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const testId = `nav-${item.path.replace("/", "")}`;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    title={expanded ? undefined : `${item.title}: ${item.description}`}
                    aria-label={expanded ? undefined : item.title}
                    data-testid={testId}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative grid min-h-11 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 rounded-lg border px-1.5 py-1.5 text-[var(--font-size-sm)] font-medium transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        expanded ? "justify-start" : "grid-cols-1 justify-items-center",
                        isActive
                          ? "border-primary/35 bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]"
                          : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/75 hover:text-foreground",
                      )
                    }
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-background/45 text-current group-hover:bg-background/65">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 leading-tight",
                        expanded ? "block" : "flex flex-col items-center text-center",
                      )}
                    >
                      <span className={cn("truncate", expanded ? "block" : "text-[10px]")}>
                        {expanded ? item.title : item.shortTitle}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 truncate text-[var(--font-size-xs)] font-normal text-muted-foreground",
                          expanded ? "block" : "sr-only",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={cn(
            "rounded-xl border border-warning/25 bg-warning/10 text-warning",
            expanded ? "p-3" : "flex items-center justify-center p-2",
          )}
        >
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div
            className={cn(
              "mt-2 text-[var(--font-size-xs)] leading-normal",
              expanded ? "block" : "sr-only",
            )}
          >
            <p className="font-semibold text-foreground">Simulation-only boundary</p>
            <p className="mt-1 text-muted-foreground">
              Synthetic telemetry only. No PLC/SCADA connectivity or live equipment commands.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 px-1",
            expanded ? "justify-between" : "justify-center",
          )}
        >
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.12em] text-muted-foreground",
              expanded ? "block" : "sr-only",
            )}
          >
            MQTT publish-only
          </span>
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border",
              isConnected
                ? "border-success/25 bg-success/10 text-success"
                : "border-warning/25 bg-warning/10 text-warning",
            )}
            title={isConnected ? "Synthetic MQTT bridge status available" : "Checking API status"}
          >
            {isConnected ? (
              <Wifi className="h-4 w-4" aria-hidden="true" />
            ) : (
              <WifiOff className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        </div>
      </div>

      {!isDrawer && !expanded ? (
        <button
          type="button"
          className="absolute -right-3 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-panel transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:flex"
          onClick={onCollapseToggle}
          aria-label="Expand navigation sidebar"
          title="Expand navigation sidebar"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {!isDrawer && expanded ? (
        <button
          type="button"
          className="absolute -right-3 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-panel transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:flex"
          onClick={onCollapseToggle}
          aria-label="Collapse navigation sidebar"
          title="Collapse navigation sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
      <div className="sr-only">
        <LockKeyhole aria-hidden="true" />
        API gateway enforces demo RBAC for simulation-only actions.
      </div>
    </aside>
  );
}
