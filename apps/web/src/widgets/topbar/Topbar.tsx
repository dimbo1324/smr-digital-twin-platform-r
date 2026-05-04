import { Clock3, ShieldAlert, UserRound, WifiOff } from "lucide-react";
import { useLocation } from "react-router-dom";
import { navigationItems } from "@/shared/config/navigation";
import { Badge } from "@/shared/ui/badge";

const pageTitles: Record<string, string> = Object.fromEntries(
  navigationItems.map((item) => [item.path, item.title]),
);

export function Topbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              SMR Digital Twin
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Demo Environment</Badge>
            <Badge variant="outline">
              <WifiOff className="h-3 w-3" aria-hidden="true" />
              Offline Mock Data
            </Badge>
            <Badge variant="warning">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              No Live Control
            </Badge>
            <Badge variant="secondary">
              <UserRound className="h-3 w-3" aria-hidden="true" />
              Engineer
            </Badge>
            <Badge variant="outline">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              Last sync: mock
            </Badge>
          </div>
        </div>

        <div className="rounded-md border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Simulation-only interface. No real plant control.
        </div>
      </div>
    </header>
  );
}
