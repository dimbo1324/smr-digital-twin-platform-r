import { mockEquipment } from "@/entities/equipment/model/mockEquipment";
import { EquipmentCard } from "@/entities/equipment/ui/EquipmentCard";
import { mockTelemetryPoints } from "@/entities/telemetry/model/mockTelemetry";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ControlValvePanel } from "@/features/control-valve/ControlValvePanel";
import { ProcessDiagram } from "@/widgets/process-diagram/ProcessDiagram";
import { useLatestTelemetry } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

export function ProcessPage() {
  const liveTelemetry = useLatestTelemetry();
  const telemetryPoints =
    liveTelemetry.points.length > 0 ? liveTelemetry.points : mockTelemetryPoints;

  return (
    <PageShell>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-panel">
          <Badge variant={liveTelemetry.state === "connected" ? "success" : "mock"}>
            {liveTelemetry.state === "connected" ? "Live synthetic telemetry" : "Mock process loop"}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
            Clean process overview for equipment, flow direction, and telemetry quality.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            The mnemonic remains simulation-only, with live synthetic telemetry routed through
            the backend API when the simulation service is available.
          </p>
        </div>

        <div className="grid gap-3 rounded-3xl border border-border/70 bg-surface-elevated/70 p-5">
          <ProcessFact label="Loop" value="SMR synthetic energy loop" />
          <ProcessFact label="Command state" value="Scenario simulation only" />
          <ProcessFact label="Telemetry source" value={liveTelemetry.state === "connected" ? "Backend -> Simulation" : "Local fallback"} />
        </div>
      </section>

      <ProcessDiagram />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Telemetry Snapshot</CardTitle>
            <CardDescription>
              Mock values shaped for future WebSocket or SSE updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {telemetryPoints.slice(0, 9).map((point) => (
                <TelemetryValue key={point.tag} point={point} />
              ))}
            </div>
          </CardContent>
        </Card>

        <ControlValvePanel />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockEquipment.map((equipment) => (
          <EquipmentCard key={equipment.id} equipment={equipment} />
        ))}
      </section>
    </PageShell>
  );
}

function ProcessFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
