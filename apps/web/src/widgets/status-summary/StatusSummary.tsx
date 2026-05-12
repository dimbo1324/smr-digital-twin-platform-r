import { Activity, Bell, Database, Server } from "lucide-react";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { useActiveSimulationAlarms, useLatestTelemetry } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

interface SummaryItem {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  variant: "offline" | "mock" | "success" | "warning";
  metric: string;
}

export function StatusSummary() {
  const systemStatus = useSystemStatus();
  const telemetry = useLatestTelemetry();
  const alarms = useActiveSimulationAlarms();
  const simulationConnected =
    systemStatus.state === "connected" && systemStatus.status.simulationConnected;

  const items: SummaryItem[] = [
    {
      label: "Reactor Module Status",
      value: "Simulation Only",
      detail: "No real plant interface",
      icon: Server,
      variant: "offline",
      metric: "safe boundary",
    },
    {
      label: "Thermal Loop",
      value: telemetry.state === "connected" ? "Live" : "Fallback",
      detail: simulationConnected ? "Backend -> simulation" : "Mock/offline state",
      icon: Activity,
      variant: telemetry.state === "connected" ? "success" : "mock",
      metric: telemetry.state === "connected" ? "api source" : "fallback",
    },
    {
      label: "Active Alarms",
      value: String(alarms.alarms.length),
      detail: "Generated active alarms only",
      icon: Bell,
      variant: alarms.alarms.length > 0 ? "warning" : "success",
      metric: alarms.alarms.length > 0 ? "active" : "clear",
    },
    {
      label: "Telemetry Points",
      value: String(telemetry.points.length),
      detail: "Unit overview + process loop",
      icon: Database,
      variant: telemetry.state === "connected" ? "success" : "warning",
      metric: telemetry.state === "connected" ? "live tags" : "fallback tags",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <Card
          key={item.label}
          className="relative overflow-hidden"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {item.value}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-2.5 text-primary">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{item.detail}</p>
              <Badge variant={item.variant}>{item.metric}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
