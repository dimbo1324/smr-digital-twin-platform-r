import { NavLink } from "react-router-dom";
import { Radio, ShieldAlert, WifiOff } from "lucide-react";
import { navigationItems } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";

export function AppSidebar() {
  return (
    <aside className="border-b border-white/10 bg-zinc-950/95 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-5 p-4 lg:sticky lg:top-0 lg:min-h-screen lg:p-5">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-white">
                SMR Twin Platform
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Digital Twin Simulator
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="warning">
              <WifiOff className="h-3 w-3" aria-hidden="true" />
              Simulation Offline
            </Badge>
            <Badge variant="default">Demo Mode</Badge>
          </div>
        </div>

        <nav className="grid gap-1 sm:grid-cols-5 lg:grid-cols-1" aria-label="Primary">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white",
                  isActive &&
                    "border border-cyan-400/25 bg-cyan-500/10 text-cyan-100 shadow-[inset_3px_0_0_rgba(34,211,238,0.75)]",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden lg:block">
          <Separator />
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
              <ShieldAlert className="h-4 w-4 text-amber-200" aria-hidden="true" />
              Simulation Boundary
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              No real plant connection. All process values are mock data.
            </p>
            <p className="mt-4 font-mono text-xs text-zinc-500">
              v0.1.0-mvp-shell
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
