import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  Database,
  Gauge,
  RadioTower,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import type { Alarm, AlarmSeverity } from "@/entities/alarms/model/types";
import type { CommandRecord, CommandStatus } from "@/entities/commands/model/types";
import type { EventRecord, EventSeverity } from "@/entities/events/model/types";
import type { TelemetryPoint, TelemetryQuality } from "@/entities/telemetry/model/types";
import {
  findTelemetryByTag,
  formatTelemetryAge,
  formatTelemetryValue,
  getTelemetryAge,
} from "@/entities/telemetry/lib/selectors";
import type { SystemStatusState } from "@/shared/api/useSystemStatus";
import type { LiveTelemetryState } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type RemoteState = "loading" | "connected" | "degraded";

interface DashboardLiveOverviewProps {
  systemStatus: SystemStatusState;
  telemetry: LiveTelemetryState;
  alarms: {
    activeAlarms: Alarm[];
    history: Alarm[];
    state: RemoteState;
  };
  commands: {
    commands: CommandRecord[];
    state: RemoteState;
  };
  events: {
    events: EventRecord[];
    state: RemoteState;
  };
}

const telemetryTags = [
  { tag: "TT-101", label: "Loop Temperature" },
  { tag: "PT-101", label: "Loop Pressure" },
  { tag: "FT-101", label: "Loop Flow" },
  { tag: "LT-101", label: "Tank Level" },
  { tag: "V-101.POS", label: "Valve Position" },
  { tag: "P-101.STATE", label: "Pump State" },
];

const severityRank: Record<string, number> = {
  CRITICAL: 5,
  ERROR: 4,
  HIGH: 4,
  WARNING: 3,
  ALARM: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
  NOTICE: 0,
};

export function DashboardLiveOverview({
  systemStatus,
  telemetry,
  alarms,
  commands,
  events,
}: DashboardLiveOverviewProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-4">
        <PlatformStatusCard systemStatus={systemStatus} />
        <SimulationStatusCard systemStatus={systemStatus} telemetry={telemetry} />
        <AlarmSummaryCard alarms={alarms} />
        <CommandSummaryCard commands={commands} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ProcessTelemetrySummary telemetry={telemetry} />
        <RecentEventsFeed events={events} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SystemBoundaryPanel systemStatus={systemStatus} />
        <CurrentLimitationsPanel />
      </section>
    </div>
  );
}

function PlatformStatusCard({ systemStatus }: { systemStatus: SystemStatusState }) {
  const isConnected = systemStatus.state === "connected";
  const apiStatus = isConnected ? systemStatus.status.backendApi.status : systemStatus.state === "checking" ? "checking" : "offline";
  const apiVariant = apiStatus === "ok" || apiStatus === "connected" ? "success" : apiStatus === "checking" ? "warning" : "offline";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Platform Status</CardTitle>
          <Badge variant={apiVariant}>{apiLabel(apiStatus)}</Badge>
        </div>
        <CardDescription>Actual backend API health and platform mode.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {systemStatus.state === "checking" ? (
          <StateNotice label="Checking API status..." />
        ) : systemStatus.state === "offline" ? (
          <StateNotice label="API unavailable. Dashboard cards will show independent offline states." tone="offline" />
        ) : (
          <>
            <SummaryRow label="Environment" value={systemStatus.status.environment} />
            <SummaryRow label="Platform mode" value={systemStatus.status.mode} />
            <SummaryRow label="Control boundary" value={systemStatus.status.controlBoundary} />
            <SummaryRow label="Version" value={systemStatus.status.version} />
            <p className="pt-2 text-xs text-muted-foreground">
              Last sync: {formatAge(systemStatus.status.timestamp)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SimulationStatusCard({
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
        <SummaryRow label="MQTT" value="Not implemented" badge="offline" />
        <SummaryRow label="Historian" value="In-memory" badge="warning" />
      </CardContent>
    </Card>
  );
}

function AlarmSummaryCard({
  alarms,
}: {
  alarms: DashboardLiveOverviewProps["alarms"];
}) {
  const active = alarms.activeAlarms.filter((alarm) => alarm.status === "ACTIVE");
  const acknowledged = alarms.activeAlarms.filter((alarm) => alarm.status === "ACKNOWLEDGED");
  const latestActive = newestAlarm(alarms.activeAlarms);
  const latestCleared = newestAlarm(alarms.history);
  const highestSeverity = highestAlarmSeverity(alarms.activeAlarms);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Alarm Summary</CardTitle>
          <Badge variant={active.length > 0 ? "destructive" : acknowledged.length > 0 ? "warning" : "success"}>
            {alarms.state === "degraded" ? "Unavailable" : `${active.length} active`}
          </Badge>
        </div>
        <CardDescription>Real active alarm endpoint, excluding cleared history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alarms.state === "loading" ? (
          <StateNotice label="Loading alarm state..." />
        ) : alarms.state === "degraded" ? (
          <StateNotice label="Alarm data unavailable." tone="offline" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <CompactMetric label="ACTIVE" value={String(active.length)} />
              <CompactMetric label="ACK" value={String(acknowledged.length)} />
              <CompactMetric label="CLEARED" value={String(alarms.history.length)} />
            </div>
            <SummaryRow label="Highest severity" value={highestSeverity ?? "None"} badge={highestSeverity ? alarmBadge(highestSeverity) : "success"} />
            {latestActive ? (
              <PreviewText label={latestActive.tag} value={latestActive.message} />
            ) : latestCleared ? (
              <PreviewText label="Latest cleared" value={`${latestCleared.tag}: ${latestCleared.message}`} />
            ) : (
              <StateNotice label="No active alarms." tone="success" />
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/alarms">
                View alarms <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CommandSummaryCard({
  commands,
}: {
  commands: DashboardLiveOverviewProps["commands"];
}) {
  const latestCommand = newestCommand(commands.commands);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Command Summary</CardTitle>
          <Badge variant={latestCommand ? commandBadge(latestCommand.status) : "outline"}>
            {latestCommand?.status ?? "None"}
          </Badge>
        </div>
        <CardDescription>Simulation-only command history from the API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {commands.state === "loading" ? (
          <StateNotice label="Loading command history..." />
        ) : commands.state === "degraded" ? (
          <StateNotice label="Command history unavailable." tone="offline" />
        ) : latestCommand ? (
          <>
            <SummaryRow label="Target" value={latestCommand.targetTag} />
            <SummaryRow label="Command" value={latestCommand.commandType} />
            <SummaryRow label="Requested" value={formatAge(commandTimestamp(latestCommand))} />
            <PreviewText
              label="Result"
              value={latestCommand.resultMessage ?? latestCommand.errorMessage ?? "Command accepted by simulation layer."}
            />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/process">
                View process <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <StateNotice label="No commands issued yet." />
        )}
      </CardContent>
    </Card>
  );
}

function ProcessTelemetrySummary({ telemetry }: { telemetry: LiveTelemetryState }) {
  const hasTelemetry = telemetry.points.length > 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Process Telemetry Summary</CardTitle>
          <Badge variant={telemetry.state === "connected" ? "success" : telemetry.state === "loading" ? "warning" : "offline"}>
            {telemetry.state === "connected" ? "Simulation API" : telemetry.state}
          </Badge>
        </div>
        <CardDescription>
          Live synthetic process-loop values from <span className="font-mono">/api/v1/telemetry/latest</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {telemetry.state === "loading" && !hasTelemetry ? (
          <StateNotice label="Waiting for simulation telemetry..." />
        ) : telemetry.state === "degraded" && !hasTelemetry ? (
          <StateNotice label="No telemetry data available from the API." tone="offline" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {telemetryTags.map((item) => {
              const point = findTelemetryByTag(telemetry.points, item.tag);
              return (
                <TelemetryMetric
                  key={item.tag}
                  label={item.label}
                  tag={item.tag}
                  point={point}
                  age={formatTelemetryAge(getTelemetryAge(telemetry.points, item.tag))}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventsFeed({ events }: { events: DashboardLiveOverviewProps["events"] }) {
  const latestEvents = newestEvents(events.events).slice(0, 6);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Recent Events</CardTitle>
          <Badge variant={events.state === "connected" ? "success" : events.state === "loading" ? "warning" : "offline"}>
            Live stream
          </Badge>
        </div>
        <CardDescription>Unified command, alarm, and simulation event stream.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.state === "loading" ? (
          <StateNotice label="Loading recent events..." />
        ) : events.state === "degraded" ? (
          <StateNotice label="Events unavailable." tone="offline" />
        ) : latestEvents.length === 0 ? (
          <StateNotice label="No events recorded yet." />
        ) : (
          <>
            {latestEvents.map((event) => (
              <EventPreview key={event.id} event={event} />
            ))}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/events">
                View all events <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SystemBoundaryPanel({ systemStatus }: { systemStatus: SystemStatusState }) {
  const source =
    systemStatus.state === "connected" && systemStatus.status.dataSource
      ? systemStatus.status.dataSource
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
        <BoundaryItem icon={Database} label="Storage" value="In-memory history" />
        <BoundaryItem icon={Activity} label="Transport" value="REST polling" />
        <BoundaryItem icon={TerminalSquare} label="Control" value="Simulation-only commands" />
        <BoundaryItem icon={ShieldCheck} label="Real plant control" value="Not supported" />
      </CardContent>
    </Card>
  );
}

function CurrentLimitationsPanel() {
  const implemented = [
    "Live synthetic telemetry",
    "Simulation-only valve/pump commands",
    "Alarm lifecycle",
    "Unified events page",
    "In-memory trends",
  ];
  const notImplemented = [
    "MQTT",
    "WebSocket/SSE",
    "Persistent historian",
    "PID controller",
    "Auth/RBAC",
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

function TelemetryMetric({
  label,
  tag,
  point,
  age,
}: {
  label: string;
  tag: string;
  point?: TelemetryPoint;
  age: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{tag}</p>
        </div>
        <Badge variant={qualityBadge(point?.quality)}>{point?.quality ?? "MISSING"}</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground">{formatTelemetryValue(point)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={point ? "mock" : "offline"}>{point ? telemetrySource(point) : "No data"}</Badge>
        <span>{age}</span>
      </div>
    </div>
  );
}

function EventPreview({ event }: { event: EventRecord }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={eventBadge(event.severity)}>{event.severity}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{event.type}</span>
        {event.targetTag ? (
          <span className="font-mono text-xs text-muted-foreground">{event.targetTag}</span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground/80">{event.message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{event.source}</span>
        <span>{formatAge(event.timestamp)}</span>
        {event.commandId ? <span className="font-mono">cmd {event.commandId.slice(0, 8)}</span> : null}
        {event.alarmId ? <span className="font-mono">alarm {event.alarmId.slice(0, 8)}</span> : null}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  badge = "outline",
}: {
  label: string;
  value: string;
  badge?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "info" | "mock" | "offline";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-elevated/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={badge}>{value}</Badge>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PreviewText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-subtle/60 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/80">{value}</p>
    </div>
  );
}

function StateNotice({
  label,
  tone = "warning",
}: {
  label: string;
  tone?: "warning" | "offline" | "success";
}) {
  const iconTone =
    tone === "offline" ? "text-offline" : tone === "success" ? "text-success" : "text-warning";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-subtle/60 p-4 text-sm text-muted-foreground">
      <AlertTriangle className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function BoundaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function CapabilityList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "success" | "offline";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <Badge variant={variant}>{title}</Badge>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function newestAlarm(alarms: Alarm[]): Alarm | undefined {
  return [...alarms].sort((left, right) => timestampMs(right.activeAt ?? right.createdAt) - timestampMs(left.activeAt ?? left.createdAt))[0];
}

function newestCommand(commands: CommandRecord[]): CommandRecord | undefined {
  return [...commands].sort((left, right) => timestampMs(commandTimestamp(right)) - timestampMs(commandTimestamp(left)))[0];
}

function newestEvents(events: EventRecord[]): EventRecord[] {
  return [...events].sort((left, right) => timestampMs(right.timestamp) - timestampMs(left.timestamp));
}

function commandTimestamp(command: CommandRecord): string {
  return command.completedAt ?? command.acceptedAt ?? command.rejectedAt ?? command.requestedAt;
}

function highestAlarmSeverity(alarms: Alarm[]): AlarmSeverity | undefined {
  return [...alarms].sort((left, right) => (severityRank[right.severity] ?? 0) - (severityRank[left.severity] ?? 0))[0]?.severity;
}

function timestampMs(timestamp: string | undefined): number {
  if (!timestamp) {
    return 0;
  }

  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) ? value : 0;
}

function formatAge(timestamp: string | undefined): string {
  if (!timestamp) {
    return "No timestamp";
  }

  const ageMs = Math.max(0, Date.now() - timestampMs(timestamp));
  if (ageMs < 1000) {
    return "just now";
  }

  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return new Date(timestamp).toLocaleString();
}

function telemetrySource(point: TelemetryPoint): string {
  if (point.source === "simulation") {
    return "Simulation / Synthetic";
  }

  if (point.source?.includes("mock")) {
    return "Mock";
  }

  return point.source ?? "Fallback";
}

function apiLabel(status: string): string {
  if (status === "ok" || status === "connected") {
    return "Connected";
  }

  if (status === "checking") {
    return "Checking";
  }

  return "Offline";
}

function qualityBadge(quality: TelemetryQuality | undefined) {
  if (quality === "GOOD") {
    return "success";
  }

  if (quality === "UNCERTAIN") {
    return "warning";
  }

  return "offline";
}

function alarmBadge(severity: string) {
  if (severity === "CRITICAL" || severity === "HIGH" || severity === "ALARM") {
    return "destructive";
  }

  if (severity === "WARNING" || severity === "MEDIUM") {
    return "warning";
  }

  return "secondary";
}

function commandBadge(status: CommandStatus) {
  if (status === "COMPLETED" || status === "ACCEPTED") {
    return "success";
  }

  if (status === "FAILED" || status === "REJECTED") {
    return "destructive";
  }

  return "warning";
}

function eventBadge(severity: EventSeverity) {
  if (severity === "CRITICAL" || severity === "ERROR") {
    return "destructive";
  }

  if (severity === "WARNING") {
    return "warning";
  }

  return "secondary";
}
