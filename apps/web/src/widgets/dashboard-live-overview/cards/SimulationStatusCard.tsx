import { SummaryRow } from "./primitives";
import type { LiveTelemetryState } from "@/shared/api/useSimulationTelemetry";
import type { SystemStatusState } from "@/shared/api/useSystemStatus";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SimulationStatusCard({
  systemStatus,
  telemetry,
}: {
  systemStatus: SystemStatusState;
  telemetry: LiveTelemetryState;
}) {
  const connected = systemStatus.state === "connected" && systemStatus.status.simulationConnected;
  const telemetryConnected = telemetry.state === "connected" || telemetry.state === "degraded";
  const statusLabel = connected ? "Connected" : telemetryConnected ? "Telemetry reachable" : "Unavailable";
  const statusVariant = connected ? "success" : telemetryConnected ? "warning" : "offline";
  const simulationHealth =
    systemStatus.state === "connected" ? systemStatus.status.simulationHealth ?? "UNKNOWN" : "UNKNOWN";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Simulation Status</CardTitle>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <CardDescription>In-memory simulation layer and current transport.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryRow label="Health" value={simulationHealth} />
        <SummaryRow label="Telemetry mode" value="Synthetic" badge="mock" />
        <SummaryRow label="Transport" value="REST polling" badge="info" />
        <SummaryRow label="MQTT" value="Publish-only bridge" badge="info" />
        <SummaryRow label="Historian" value="Persistent optional / in-memory fallback" badge="warning" />
      </CardContent>
    </Card>
  );
}
