import { Clock3, DatabaseZap, ShieldAlert, UserRound, Wifi, WifiOff } from "lucide-react";
import { useLocation } from "react-router-dom";
import { navigationItems } from "@/shared/config/navigation";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { Badge } from "@/shared/ui/badge";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

const pageMeta: Record<string, { title: string; eyebrow: string; description: string }> =
  Object.fromEntries(
    navigationItems.map((item) => [
      item.path,
      {
        title: item.title,
        eyebrow: "SMR Digital Twin",
        description: getDescription(item.title),
      },
    ]),
  );

function getDescription(title: string) {
  switch (title) {
    case "Dashboard":
      return "Executive telemetry overview for the simulation shell.";
    case "Process":
      return "Mock process mnemonic and equipment readiness view.";
    case "Alarms":
      return "Alarm lifecycle workspace for simulated operations.";
    case "Trends":
      return "Historian-style trend exploration with mock telemetry.";
    case "Settings":
      return "Local shell preferences and future integration placeholders.";
    default:
      return "Simulation-only interface. No real plant control.";
  }
}

export function Topbar() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? pageMeta["/dashboard"];
  const systemStatus = useSystemStatus();

  const apiBadge = getApiBadge(systemStatus.state);
  const environmentLabel =
    systemStatus.state === "connected"
      ? `${systemStatus.status.environment} Environment`
      : "Demo Environment";
  const lastSyncLabel =
    systemStatus.state === "connected" ? "Last sync: backend API" : "Last sync: mock";

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/70 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {meta.eyebrow}
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h2 className="text-2xl font-semibold leading-tight text-foreground">
                {meta.title}
              </h2>
              <p className="pb-1 text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="mock">
              <DatabaseZap className="h-3.5 w-3.5" aria-hidden="true" />
              {environmentLabel}
            </Badge>
            <Badge variant={apiBadge.variant}>
              <apiBadge.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {apiBadge.label}
            </Badge>
            <Badge variant="warning">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              No Live Control
            </Badge>
            <Badge variant="secondary">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Engineer
            </Badge>
            <Badge variant="outline">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {lastSyncLabel}
            </Badge>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">Simulation-only interface. No real plant control.</span>
          <span className="text-muted-foreground">
            Commands remain disabled until a simulation command layer exists.
          </span>
        </div>
      </div>
    </header>
  );
}

function getApiBadge(state: ReturnType<typeof useSystemStatus>["state"]) {
  switch (state) {
    case "connected":
      return {
        label: "Backend API",
        variant: "success" as const,
        icon: Wifi,
      };
    case "checking":
      return {
        label: "Checking API",
        variant: "mock" as const,
        icon: DatabaseZap,
      };
    default:
      return {
        label: "Offline Mock Data",
        variant: "offline" as const,
        icon: WifiOff,
      };
  }
}
