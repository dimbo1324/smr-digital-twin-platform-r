import { mockEquipment } from "@/entities/equipment/model/mockEquipment";
import { EquipmentCard } from "@/entities/equipment/ui/EquipmentCard";
import { mockTelemetryPoints } from "@/entities/telemetry/model/mockTelemetry";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ControlValvePanel } from "@/features/control-valve/ControlValvePanel";
import { ProcessDiagram } from "@/widgets/process-diagram/ProcessDiagram";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function ProcessPage() {
  return (
    <>
      <ProcessDiagram />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Telemetry Snapshot</CardTitle>
            <CardDescription>
              Mock values shaped for future WebSocket or SSE updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mockTelemetryPoints.map((point) => (
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
    </>
  );
}
