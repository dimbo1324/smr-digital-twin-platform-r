import { BellRing, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Alarm } from "@/entities/alarms/model/types";
import { useAlarms } from "@/entities/alarms/api/useAlarms";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";
import { useAuthSession } from "@/entities/auth/api/useAuthSession";
import { hasPermission, permissions, roleDeniedReason } from "@/entities/auth/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const severityVariant: Record<Alarm["severity"], "outline" | "warning" | "destructive"> = {
  INFO: "outline",
  WARNING: "warning",
  HIGH: "destructive",
  ALARM: "destructive",
  CRITICAL: "destructive",
};

const statusVariant: Record<Alarm["status"], "warning" | "mock" | "success"> = {
  ACTIVE: "warning",
  ACKNOWLEDGED: "mock",
  CLEARED: "success",
};

export function AlarmsPage() {
  const alarms = useAlarms();
  const auth = useAuthSession();
  const canAcknowledgeAlarm = hasPermission(auth.session, permissions.acknowledgeAlarm);
  const activeCount = alarms.activeAlarms.filter((alarm) => alarm.status === "ACTIVE").length;
  const acknowledgedCount = alarms.activeAlarms.filter(
    (alarm) => alarm.status === "ACKNOWLEDGED",
  ).length;

  return (
    <PageShell data-testid="alarms-page">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-panel">
          <Badge variant={alarms.state === "connected" ? "success" : "warning"}>
            {alarms.state === "connected" ? "Live alarm lifecycle" : "Alarm API unavailable"}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
            Alarm operations for the simulation-only process.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Alarm instances are generated from synthetic telemetry, acknowledged by the demo
            operator, cleared automatically when the condition normalizes, and recorded in the
            unified event trail.
          </p>
        </div>

        <div className="grid gap-3 rounded-3xl border border-border/70 bg-surface-elevated/70 p-5">
          <SummaryItem
            label="Active"
            value={String(activeCount)}
            tone={activeCount > 0 ? "warning" : "success"}
          />
          <SummaryItem label="Acknowledged" value={String(acknowledgedCount)} tone="mock" />
          <SummaryItem
            label="Cleared history"
            value={String(alarms.history.length)}
            tone="outline"
          />
        </div>
      </section>

      {alarms.feedback ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${alarms.feedback.type === "success" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
          role={alarms.feedback.type === "success" ? "status" : "alert"}
        >
          {alarms.feedback.message}
        </div>
      ) : null}

      <Card data-testid="active-alarms-section">
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Active And Acknowledged Alarms</CardTitle>
            <CardDescription>
              Live simulation alarm instances. Cleared alarms are removed from this list.
            </CardDescription>
          </div>
          <Badge variant={alarms.activeAlarms.length > 0 ? "warning" : "success"}>
            {alarms.activeAlarms.length} open
          </Badge>
        </CardHeader>
        <CardContent data-testid="active-alarms-list">
          {alarms.state === "loading" ? (
            <StatePanel
              icon={Clock3}
              title="Loading alarms"
              description="Reading current alarm state from the API."
            />
          ) : alarms.state === "degraded" ? (
            <StatePanel
              icon={ShieldAlert}
              title="Alarm API unavailable"
              description="The page is not showing live alarm data right now."
            />
          ) : alarms.activeAlarms.length === 0 ? (
            <StatePanel
              icon={CheckCircle2}
              title="No active alarms"
              description="No synthetic alarm conditions are currently active."
            />
          ) : (
            <AlarmTable
              alarms={alarms.activeAlarms}
              acknowledgingId={alarms.acknowledgingId}
              onAcknowledge={alarms.acknowledge}
              canAcknowledge={canAcknowledgeAlarm}
              deniedReason={roleDeniedReason(auth.session, "acknowledge simulation alarms")}
            />
          )}
        </CardContent>
      </Card>

      <Card data-testid="alarm-history-section">
        <CardHeader>
          <CardTitle>Cleared Alarm History</CardTitle>
          <CardDescription>
            Alarm history from the persistent historian when connected, with in-memory fallback
            otherwise.
          </CardDescription>
        </CardHeader>
        <CardContent data-testid="alarm-history-list">
          {alarms.state === "connected" && alarms.history.length === 0 ? (
            <StatePanel
              icon={BellRing}
              title="No cleared alarms yet"
              description="Cleared alarm instances will appear here after conditions normalize."
            />
          ) : (
            <AlarmTable alarms={alarms.history} />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function AlarmTable({
  alarms,
  acknowledgingId,
  onAcknowledge,
  canAcknowledge = true,
  deniedReason,
}: {
  alarms: Alarm[];
  acknowledgingId?: string;
  onAcknowledge?: (id: string) => Promise<Alarm>;
  canAcknowledge?: boolean;
  deniedReason?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Alarm</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Lifecycle</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alarms.map((alarm) => (
          <TableRow key={alarm.id} data-testid="alarm-row">
            <TableCell className="min-w-[280px]">
              <div className="font-mono text-xs text-muted-foreground">
                {alarm.code ?? alarm.id}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{alarm.message}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {alarm.tag} · {alarm.source ?? "simulation"}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={severityVariant[alarm.severity]}>{alarm.severity}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[alarm.status]}>{alarm.status}</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap font-mono text-xs text-foreground">
              {formatNumber(alarm.lastValue ?? alarm.value)} {alarm.unit}
              <div className="text-muted-foreground">limit {formatNumber(alarm.threshold)}</div>
            </TableCell>
            <TableCell className="min-w-[260px] text-xs leading-5 text-muted-foreground">
              <div>Active: {formatDate(alarm.activeAt ?? alarm.createdAt)}</div>
              {alarm.acknowledgedAt ? (
                <div>
                  Ack: {formatDate(alarm.acknowledgedAt)} by {alarm.acknowledgedBy}
                </div>
              ) : null}
              {alarm.clearedAt ? <div>Cleared: {formatDate(alarm.clearedAt)}</div> : null}
            </TableCell>
            <TableCell>
              {alarm.status === "ACTIVE" && onAcknowledge ? (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    disabled={acknowledgingId === alarm.id || !canAcknowledge}
                    onClick={() => void onAcknowledge(alarm.id)}
                    data-testid="acknowledge-alarm-button"
                    title={!canAcknowledge ? deniedReason : undefined}
                  >
                    {acknowledgingId === alarm.id ? "Acknowledging" : "Acknowledge"}
                  </Button>
                  {!canAcknowledge && deniedReason ? (
                    <p className="max-w-[12rem] text-xs leading-5 text-warning" role="status">
                      {deniedReason}
                    </p>
                  ) : null}
                </div>
              ) : alarm.status === "ACKNOWLEDGED" ? (
                <Badge variant="mock">seen</Badge>
              ) : (
                <Badge variant="success">closed</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatePanel({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-border/70 bg-surface-subtle/60 p-8 text-center">
      <div className="rounded-full border border-border/70 bg-card p-4 text-primary">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "mock" | "outline";
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function formatNumber(value?: number) {
  if (value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(2);
}
