import { EquipmentCard } from "@/entities/equipment/ui/EquipmentCard";
import { useAssets } from "@/entities/equipment/api/useAssets";
import { demoFallbackTelemetryPoints } from "@/entities/telemetry/model/demoFallbackTelemetry";
import { findTelemetryByTag } from "@/entities/telemetry/lib/selectors";
import { PROCESS_ASSET_TAGS, PROCESS_LOOP_TELEMETRY_TAGS } from "@/entities/telemetry/model/processTags";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ControlValvePanel } from "@/features/control-valve/ControlValvePanel";
import { ControlModePanel } from "@/features/control-mode/ControlModePanel";
import { PumpControlPanel } from "@/features/control-pump/PumpControlPanel";
import { PidControllerPanel } from "@/features/pid-controller/PidControllerPanel";
import { useControlStatus } from "@/entities/control/api/useControlStatus";
import { usePidStatus } from "@/entities/pid/api/usePidStatus";
import { useCommandHistory } from "@/entities/commands/api/useCommandHistory";
import { useAuthSession } from "@/entities/auth/api/useAuthSession";
import { hasPermission, permissions, roleDeniedReason } from "@/entities/auth/lib/permissions";
import { CommandEventPanel } from "@/widgets/command-event-panel/CommandEventPanel";
import { ProcessDiagram } from "@/widgets/process-diagram/ProcessDiagram";
import { useLatestTelemetry } from "@/shared/api/useSimulationTelemetry";
import { displayLabel } from "@/shared/lib/display-labels";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

export function ProcessPage() {
  const liveTelemetry = useLatestTelemetry();
  const assets = useAssets();
  const control = useControlStatus();
  const pid = usePidStatus();
  const commandHistory = useCommandHistory();
  const auth = useAuthSession();
  const canSendCommand = hasPermission(auth.session, permissions.sendCommand);
  const canChangeControlMode = hasPermission(auth.session, permissions.changeControlMode);
  const canUpdatePidConfig = hasPermission(auth.session, permissions.updatePidConfig);
  const telemetryPoints =
    liveTelemetry.points.length > 0 ? liveTelemetry.points : demoFallbackTelemetryPoints;
  const processTelemetryPoints = PROCESS_LOOP_TELEMETRY_TAGS
    .map(({ tag }) => findTelemetryByTag(telemetryPoints, tag))
    .filter((point) => point !== undefined);
  const processAssets = assets.assets.filter((asset) =>
    PROCESS_ASSET_TAGS.includes(asset.tag as (typeof PROCESS_ASSET_TAGS)[number]),
  );

  return (
    <PageShell data-testid="process-page">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-panel lg:p-5">
          <Badge variant={liveTelemetry.state === "connected" ? "success" : "mock"}>
            {liveTelemetry.state === "connected" ? "Live synthetic telemetry" : "Demo fallback process loop"}
          </Badge>
          <h1 className="mt-3 text-2xl font-semibold leading-tight text-foreground">
            Clean process overview for equipment, flow direction, and telemetry quality.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            The mnemonic remains simulation-only, with live synthetic telemetry routed through
            the backend API when the simulation service is available.
          </p>
        </div>

        <div className="grid gap-2 rounded-3xl border border-border/70 bg-surface-elevated/70 p-4">
          <ProcessFact label="Loop" value="SMR synthetic energy loop" />
          <ProcessFact label="Command state" value={control.controlStatus?.mode === "AUTO" ? "PID owns V-101 in AUTO" : control.controlStatus?.mode === "MANUAL" ? "Manual valve commands enabled" : "Valve commands gated by TIC-101"} />
          <ProcessFact label="Telemetry source" value={liveTelemetry.state === "connected" ? "Backend -> Simulation" : "Local fallback"} />
          <ProcessFact label="Asset source" value={assetSourceLabel(assets.state, assets.source)} />
        </div>
      </section>

      <ProcessDiagram telemetryPoints={telemetryPoints} dataState={liveTelemetry.state} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Telemetry Snapshot</CardTitle>
            <CardDescription>
              Process-loop and unit overview values from the backend API, with demo fallback when unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {processTelemetryPoints.map((point) => (
                <TelemetryValue key={point.tag} point={point} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <ControlModePanel
            controlStatus={control.controlStatus}
            state={control.state}
            canChangeMode={canChangeControlMode}
            roleDeniedReason={roleDeniedReason(auth.session, "change TIC-101 control mode")}
          />
          <PidControllerPanel
            pidStatus={pid.pidStatus}
            state={pid.state}
            canUpdateConfig={canUpdatePidConfig}
            roleDeniedReason={roleDeniedReason(auth.session, "update TIC-101 PID settings")}
          />
          <ControlValvePanel
            telemetryPoints={telemetryPoints}
            dataState={liveTelemetry.state}
            controlStatus={control.controlStatus}
            canSendCommand={canSendCommand}
            roleDeniedReason={roleDeniedReason(auth.session, "send V-101 simulation commands")}
            onCommandComplete={commandHistory.refresh}
          />
          <PumpControlPanel
            telemetryPoints={telemetryPoints}
            dataState={liveTelemetry.state}
            canSendCommand={canSendCommand}
            roleDeniedReason={roleDeniedReason(auth.session, "send P-101 simulation commands")}
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
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-foreground" title={displayLabel(value)}>
        {displayLabel(value)}
      </span>
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
