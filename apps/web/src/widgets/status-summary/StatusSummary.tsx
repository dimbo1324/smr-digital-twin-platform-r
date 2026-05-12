import { Activity, Bell, Database, Server } from "lucide-react";
import { mockTelemetrySummary } from "@/entities/telemetry/model/mockTelemetry";
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

const items: SummaryItem[] = [
  {
    label: "Reactor Module Status",
    value: "Not Connected",
    detail: "No real plant interface",
    icon: Server,
    variant: "offline",
    metric: "safe boundary",
  },
  {
    label: "Thermal Loop",
    value: "Mock",
    detail: "Static process model shell",
    icon: Activity,
    variant: "mock",
    metric: "demo source",
  },
  {
    label: "Active Alarms",
    value: "0",
    detail: "Historical examples only",
    icon: Bell,
    variant: "success",
    metric: "clear",
  },
  {
    label: "Telemetry Points",
    value: String(mockTelemetrySummary.totalPoints),
    detail: "TT, PT, FT, LT, valve, pump",
    icon: Database,
    variant: "warning",
    metric: "mock tags",
  },
];

export function StatusSummary() {
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
