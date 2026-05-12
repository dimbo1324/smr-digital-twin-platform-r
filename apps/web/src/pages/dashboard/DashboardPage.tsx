import { ArrowUpRight, FileText, GitBranch, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { historicalAlarms } from "@/entities/alarms/model/mockAlarms";
import { mockEvents } from "@/entities/events/model/mockEvents";
import { mockTelemetrySummary } from "@/entities/telemetry/model/mockTelemetry";
import { AlarmList } from "@/widgets/alarm-list/AlarmList";
import { StatusSummary } from "@/widgets/status-summary/StatusSummary";
import { TrendPreview } from "@/widgets/trend-preview/TrendPreview";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { useLatestTelemetry } from "@/shared/api/useSimulationTelemetry";
import { useProcessTopology } from "@/shared/api/useProcessTopology";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

export function DashboardPage() {
  const systemStatus = useSystemStatus();
  const liveTelemetry = useLatestTelemetry();
  const processTopology = useProcessTopology(5000);
  const telemetryCount =
    liveTelemetry.points.length > 0 ? liveTelemetry.points.length : mockTelemetrySummary.totalPoints;
  const mode =
    systemStatus.state === "connected" && systemStatus.status.simulationMode
      ? systemStatus.status.simulationMode
      : "DEMO";
  const health =
    systemStatus.state === "connected" && systemStatus.status.simulationHealth
      ? systemStatus.status.simulationHealth
      : "MOCK";

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-surface-elevated to-primary/10 p-6 shadow-panel lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <Badge variant={liveTelemetry.state === "connected" ? "success" : "mock"}>
              Simulation only / synthetic telemetry
            </Badge>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Industrial digital twin cockpit for a simulation-only SMR energy loop.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Live synthetic telemetry now flows from the simulation service through the
              backend API into the HMI shell, with fallback mock data when unavailable.
            </p>
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/40 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-success/10 p-3 text-success">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Simulation boundary intact
                </p>
                <p className="text-sm text-muted-foreground">
                  No live plant control, no physical actuator commands.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Simulation mode" value={mode} />
              <Metric label="Health" value={health} />
              <Metric label="Telemetry tags" value={String(telemetryCount)} />
              <Metric label="Source" value={liveTelemetry.state === "connected" ? "API" : "Fallback"} />
            </div>
          </div>
        </div>
      </section>

      <StatusSummary />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <TrendPreview />
        <SystemOverview
          simulationConnected={systemStatus.state === "connected" && systemStatus.status.simulationConnected}
          mode={mode}
          health={health}
        />
      </section>

      <ProcessHealthSummary topologyState={processTopology} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <LatestEvents />
        <MvpScope />
      </section>

      <AlarmList
        title="Recent Alarm Examples"
        description="Historical mock alarms; there are no active alarms in this shell."
        alarms={historicalAlarms.slice(0, 2)}
      />
    </PageShell>
  );
}

function ProcessHealthSummary({
  topologyState,
}: {
  topologyState: ReturnType<typeof useProcessTopology>;
}) {
  const counts = topologyState.topology.nodes.reduce(
    (acc, node) => {
      if (node.status === "OK") {
        acc.ok += 1;
      } else if (node.status === "WARNING") {
        acc.warning += 1;
      } else if (node.status === "ALARM") {
        acc.alarm += 1;
      } else if (node.status === "TRIP") {
        acc.trip += 1;
      } else {
        acc.degraded += 1;
      }
      return acc;
    },
    { ok: 0, warning: 0, alarm: 0, trip: 0, degraded: 0 },
  );

  return (
    <Card>
      <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle>Process Health</CardTitle>
          <CardDescription>
            Node-level topology summary from the backend process domain layer.
          </CardDescription>
        </div>
        <Button asChild variant="outline">
          <Link to="/process">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Open Process View
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="OK nodes" value={String(counts.ok)} />
          <Metric label="Warning nodes" value={String(counts.warning)} />
          <Metric label="Alarm nodes" value={String(counts.alarm)} />
          <Metric label="Trip nodes" value={String(counts.trip)} />
          <Metric label="Degraded" value={String(counts.degraded)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SystemOverview({
  simulationConnected,
  mode,
  health,
}: {
  simulationConnected: boolean;
  mode: string;
  health: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Overview</CardTitle>
        <CardDescription>
          Current backend and simulation connectivity state.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <OverviewRow label="Mode" value={mode} tone="mock" />
        <OverviewRow label="Simulation health" value={health} tone={health === "OK" ? "mock" : "warning"} />
        <OverviewRow label="Data source" value={simulationConnected ? "Backend Mock API" : "Fallback Mock Data"} tone={simulationConnected ? "mock" : "offline"} />
        <OverviewRow label="Control boundary" value="No Live Control" tone="warning" />
        <OverviewRow label="Simulation service" value={simulationConnected ? "Connected" : "Not Connected"} tone={simulationConnected ? "mock" : "offline"} />
        <OverviewRow label="MQTT broker" value="Not Connected" tone="offline" />
      </CardContent>
    </Card>
  );
}

function LatestEvents() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Mock Events</CardTitle>
        <CardDescription>
          Event-log shape for future platform and simulation events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4 transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-elevated/80 hover:shadow-panel"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {event.timestamp}
              </span>
              <Badge variant={event.severity === "WARNING" ? "warning" : "secondary"}>
                {event.severity}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {event.source}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/80">{event.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MvpScope() {
  const scopeItems = [
    "Industrial HMI shell",
    "Static process mnemonic",
    "Mock telemetry cards",
    "Alarm lifecycle placeholders",
    "Trend chart workspace",
    "Disabled simulation settings",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>MVP Scope</CardTitle>
        <CardDescription>
          Frontend shell boundaries for the current milestone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {scopeItems.map((scope) => (
            <div
              key={scope}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4 text-sm text-foreground transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-elevated/80 hover:shadow-panel"
            >
              <span className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                {scope}
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "mock" | "warning" | "offline";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-elevated/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}
