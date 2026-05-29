import { Activity, Database, Gauge, RadioTower, ShieldCheck, TerminalSquare } from "lucide-react";
import { dataSourceLabel } from "../lib/statusLabels";
import { BoundaryItem } from "./primitives";
import type { SystemStatusState } from "@/shared/api/useSystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SystemBoundaryCard({ systemStatus }: { systemStatus: SystemStatusState }) {
  const source =
    systemStatus.state === "connected" && systemStatus.status.dataSource
      ? dataSourceLabel(systemStatus.status.dataSource)
      : "simulation API when available";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Source / System Boundary</CardTitle>
        <CardDescription>Current platform truth for the dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <BoundaryItem icon={RadioTower} label="Data source" value={source} />
        <BoundaryItem icon={Gauge} label="Telemetry" value="Synthetic process data" />
        <BoundaryItem
          icon={Database}
          label="Storage"
          value="Persistent historian when connected; in-memory fallback otherwise"
        />
        <BoundaryItem icon={Activity} label="Transport" value="REST polling" />
        <BoundaryItem icon={TerminalSquare} label="Control" value="Simulation-only commands" />
        <BoundaryItem icon={ShieldCheck} label="Real plant control" value="Not supported" />
      </CardContent>
    </Card>
  );
}
