import { CapabilityList } from "./primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function AuthRbacStatusCard() {
  const implemented = [
    "Live synthetic telemetry",
    "Simulation-only valve/pump commands",
    "Alarm lifecycle",
    "Unified events page",
    "Persistent/in-memory trends",
    "Simulation-only PID",
    "Publish-only MQTT bridge",
    "Demo RBAC",
  ];
  const notImplemented = [
    "MQTT command ingestion",
    "WebSocket/SSE",
    "Production auth/OAuth",
    "Report export",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Capabilities</CardTitle>
        <CardDescription>Compact MVP truth without production overclaiming.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <CapabilityList title="Implemented" items={implemented} variant="success" />
        <CapabilityList title="Not implemented yet" items={notImplemented} variant="offline" />
      </CardContent>
    </Card>
  );
}
