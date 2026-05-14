import { NavLink } from "react-router-dom";
import { Radio, ShieldAlert, Sparkles, Wifi, WifiOff } from "lucide-react";
import { navigationItems } from "@/shared/config/navigation";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";

export function AppSidebar() {
  const systemStatus = useSystemStatus();
  const simulationConnected =
    systemStatus.state === "connected" && systemStatus.status.simulationConnected;

  return (
    <aside className="border-b border-border/70 bg-card/70 backdrop-blur-xl lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-5 p-4 lg:sticky lg:top-0 lg:min-h-screen lg:p-5">
        <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-4 shadow-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">
                SMR Twin Platform
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Digital Twin Simulator
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {simulationConnected ? (
                  <Wifi className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-offline" aria-hidden="true" />
                )}
                Simulation
              </div>
              <Badge variant={simulationConnected ? "success" : "offline"}>
                {simulationConnected ? "Connected" : "Offline"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-mock" aria-hidden="true" />
                Environment
              </div>
              <Badge variant="mock">Demo Mode</Badge>
            </div>
          </div>
        </div>

        <nav className="grid gap-1.5 sm:grid-cols-5 lg:grid-cols-1" aria-label="Primary">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.title.toLowerCase()}`}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-[background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/60 hover:text-foreground",
                  isActive &&
                    "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-surface-elevated text-muted-foreground transition-colors group-hover:text-primary",
                      isActive && "border-primary/25 bg-primary/10 text-primary",
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="truncate">{item.title}</span>
                  {isActive ? (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden lg:block">
          <Separator />
          <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
              Simulation Boundary
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Simulation-only interface. No real plant control.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                v0.1.0-mvp-shell
              </span>
              <Badge variant="outline">portfolio</Badge>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
