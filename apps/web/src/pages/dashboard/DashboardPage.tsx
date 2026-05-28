import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAlarms } from "@/entities/alarms/api/useAlarms";
import { useCommandHistory } from "@/entities/commands/api/useCommandHistory";
import { useRecentEvents } from "@/entities/events/api/useRecentEvents";
import { useHistorianStatus } from "@/entities/historian/api/useHistorianStatus";
import { useMqttStatus } from "@/entities/mqtt/api/useMqttStatus";
import { DashboardLiveOverview } from "@/widgets/dashboard-live-overview/DashboardLiveOverview";
import { useSystemStatus } from "@/shared/api/useSystemStatus";
import { useLatestTelemetry } from "@/shared/api/useSimulationTelemetry";
import { displayLabel } from "@/shared/lib/display-labels";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { KpiCard } from "@/shared/ui/kpi-card";
import { PageShell } from "@/shared/ui/page-shell";

export function DashboardPage() {
  const systemStatus = useSystemStatus();
  const liveTelemetry = useLatestTelemetry();
  const alarms = useAlarms();
  const commandHistory = useCommandHistory();
  const recentEvents = useRecentEvents();
  const historian = useHistorianStatus();
  const mqtt = useMqttStatus();

  const mode =
    systemStatus.state === "connected" && systemStatus.status.mode
      ? systemStatus.status.mode
      : "simulation_only";
  const environment =
    systemStatus.state === "connected" && systemStatus.status.environment
      ? systemStatus.status.environment
      : "local demo";
  const apiStatus =
    systemStatus.state === "connected"
      ? "Connected"
      : systemStatus.state === "checking"
        ? "Checking"
        : "Offline";
  const telemetrySource = liveTelemetry.state === "connected" ? "Simulation API" : "Waiting/offline";
  const historianLabel =
    historian.status?.status === "connected"
      ? "Persistent historian"
      : historian.status?.fallbackActive
        ? "In-memory fallback"
        : historian.status?.status ?? "Checking";
  const mqttLabel =
    mqtt.status?.status === "connected"
      ? "Publish-only connected"
      : mqtt.status?.status === "disabled"
        ? "Disabled"
        : mqtt.status?.status ?? "Checking";

  return (
    <PageShell data-testid="dashboard-page">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-surface-elevated to-primary/10 p-6 shadow-panel lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <Badge variant={liveTelemetry.state === "connected" ? "success" : "warning"}>
              Simulation-only dashboard / synthetic telemetry
            </Badge>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Live platform overview for the SMR digital twin simulator.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Dashboard cards now read from the API, simulation service, in-memory alarm lifecycle,
              command history, and unified event stream. The view is live for the local simulator,
              not a real plant operations screen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/process">
                  View process <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/events">
                  View events <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/40 p-5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]" data-testid="dashboard-status-card">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-success/10 p-3 text-success">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Simulation boundary intact</p>
                <p className="text-sm text-muted-foreground">
                  No real plant control. Commands affect in-memory simulation state only.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="API status" value={apiStatus} testId="dashboard-system-status" />
              <Metric label="Environment" value={environment} />
              <Metric label="Mode" value={mode} />
              <Metric label="Telemetry" value={telemetrySource} />
              <Metric label="Historian" value={historianLabel} testId="dashboard-historian-status" />
              <Metric label="MQTT bridge" value={mqttLabel} testId="dashboard-mqtt-status" />
              <Metric label="Active alarms" value={String(alarms.activeAlarms.filter((alarm) => alarm.status === "ACTIVE").length)} testId="dashboard-active-alarms-count" />
              <Metric label="Recent events" value={String(recentEvents.events.length)} testId="dashboard-recent-events" />
            </div>
          </div>
        </div>
      </section>

      <DashboardLiveOverview
        systemStatus={systemStatus}
        telemetry={liveTelemetry}
        alarms={alarms}
        commands={commandHistory}
        events={recentEvents}
      />
    </PageShell>
  );
}

function Metric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return <KpiCard label={label} value={displayLabel(value)} testId={testId} className="p-3" />;
}
