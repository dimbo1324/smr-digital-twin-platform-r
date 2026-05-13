import { EquipmentCard } from "@/entities/equipment/ui/EquipmentCard";
import { useAssets } from "@/entities/equipment/api/useAssets";
import { mockTelemetryPoints } from "@/entities/telemetry/model/mockTelemetry";
import { findTelemetryByTag } from "@/entities/telemetry/lib/selectors";
import { PROCESS_ASSET_TAGS, PROCESS_LOOP_TELEMETRY_TAGS } from "@/entities/telemetry/model/processTags";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ControlValvePanel } from "@/features/control-valve/ControlValvePanel";
import { PumpControlPanel } from "@/features/control-pump/PumpControlPanel";
import { useCommandHistory } from "@/entities/commands/api/useCommandHistory";
import { CommandEventPanel } from "@/widgets/command-event-panel/CommandEventPanel";
import { ProcessDiagram } from "@/widgets/process-diagram/ProcessDiagram";
import { useLatestTelemetry } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

export function ProcessPage() {
  const liveTelemetry = useLatestTelemetry();
  const assets = useAssets();
  const commandHistory = useCommandHistory();
  const telemetryPoints =
    liveTelemetry.points.length > 0 ? liveTelemetry.points : mockTelemetryPoints;
  const processTelemetryPoints = PROCESS_LOOP_TELEMETRY_TAGS
    .map(({ tag }) => findTelemetryByTag(telemetryPoints, tag))
    .filter((point) => point !== undefined);
  const processAssets = assets.assets.filter((asset) =>
    PROCESS_ASSET_TAGS.includes(asset.tag as (typeof PROCESS_ASSET_TAGS)[number]),
  );

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
          <ProcessFact label="Command state" value="Simulation-only commands enabled" />
          <ProcessFact label="Telemetry source" value={liveTelemetry.state === "connected" ? "Backend -> Simulation" : "Local fallback"} />
          <ProcessFact label="Asset source" value={assetSourceLabel(assets.state, assets.source)} />
        </div>
      </section>

      <ProcessDiagram telemetryPoints={telemetryPoints} dataState={liveTelemetry.state} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Telemetry Snapshot</CardTitle>
            <CardDescription>
              Process-loop and unit overview values from the backend API, with mock fallback when unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {processTelemetryPoints.map((point) => (
                <TelemetryValue key={point.tag} point={point} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <ControlValvePanel
            telemetryPoints={telemetryPoints}
            dataState={liveTelemetry.state}
            onCommandComplete={commandHistory.refresh}
          />
          <PumpControlPanel
            telemetryPoints={telemetryPoints}
            dataState={liveTelemetry.state}
            onCommandComplete={commandHistory.refresh}
          />
        </div>
      </section>

      <CommandEventPanel
        commands={commandHistory.commands}
        events={commandHistory.events}
        state={commandHistory.state}
      />

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Process Assets</CardTitle>
            <CardDescription>
              Asset cards from <span className="font-mono">/api/v1/assets</span>, filtered to the Thermal Process Loop MVP.
            </CardDescription>
          </div>
          <Badge variant={assets.state === "connected" ? "success" : assets.state === "loading" ? "warning" : "offline"}>
            {assetSourceLabel(assets.state, assets.source)}
          </Badge>
        </CardHeader>
        <CardContent>
          {assets.state === "loading" ? (
            <AssetState label="Loading process assets from API..." />
          ) : assets.state === "degraded" && processAssets.length === 0 ? (
            <AssetState label="Asset API unavailable. No live asset registry data is being shown." />
          ) : processAssets.length === 0 ? (
            <AssetState label="No process-loop assets returned by the API." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {processAssets.map((equipment) => (
                <EquipmentCard key={equipment.id} equipment={equipment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

function AssetState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-subtle/60 p-5 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function assetSourceLabel(state: "loading" | "connected" | "degraded", source?: string) {
  if (state === "loading") {
    return "Loading";
  }

  if (source === "simulation") {
    return "Simulation API";
  }

  if (state === "degraded") {
    return source ? `${source} fallback` : "Unavailable";
  }

  return source ?? "API";
}
