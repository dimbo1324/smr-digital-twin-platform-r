import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { Alarm, AlarmEvent, AlarmSeverity, AlarmStatus } from "@/entities/alarms/model/types";
import { AcknowledgeDialog } from "@/widgets/alarms/AcknowledgeDialog";
import { AlarmDetailsPanel } from "@/widgets/alarms/AlarmDetailsPanel";
import { AlarmEventLog } from "@/widgets/alarms/AlarmEventLog";
import { AlarmFilters } from "@/widgets/alarms/AlarmFilters";
import { AlarmRows } from "@/widgets/alarms/AlarmRows";
import { AlarmSummaryCards } from "@/widgets/alarms/AlarmSummaryCards";
import type { AlarmSummary } from "@/widgets/alarms/AlarmSummaryCards";
import { useAcknowledgeAlarm, useAlarmEvents, useAlarms } from "@/shared/api/useAlarms";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

type AlarmTab = "active" | "acknowledged" | "events" | "all";

const tabs: Array<{ id: AlarmTab; label: string }> = [
  { id: "active", label: "Active" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "events", label: "Event Log" },
  { id: "all", label: "All" },
];

export function AlarmsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<AlarmTab>("active");
  const [severity, setSeverity] = useState<"ALL" | AlarmSeverity>("ALL");
  const [status, setStatus] = useState<"ALL" | AlarmStatus>("ALL");
  const [node, setNode] = useState(searchParams.get("node") ?? "ALL");
  const [query, setQuery] = useState("");
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm>();
  const [acknowledgingAlarm, setAcknowledgingAlarm] = useState<Alarm>();
  const [ackNote, setAckNote] = useState("");

  const allAlarms = useAlarms();
  const events = useAlarmEvents(100);
  const acknowledgeAlarm = useAcknowledgeAlarm();

  const activeAlarms = allAlarms.data.filter(isActiveLifecycleAlarm);
  const acknowledgedAlarms = allAlarms.data.filter((alarm) => alarm.status === "ACKNOWLEDGED");
  const filteredAlarms = filterAlarms(
    tab === "acknowledged" ? acknowledgedAlarms : tab === "all" ? allAlarms.data : activeAlarms,
    { severity, status, node, query },
  );
  const filteredEvents = filterEvents(events.data, { severity, node, query });
  const nodeOptions = useNodeOptions(allAlarms.data, events.data);
  const summary = summarizeAlarms(activeAlarms, acknowledgedAlarms, events.data.length);
  const relatedEvents = selectedAlarm
    ? events.data.filter((event) => event.alarmId === selectedAlarm.id)
    : [];

  const submitAcknowledge = async () => {
    if (!acknowledgingAlarm) {
      return;
    }
    await acknowledgeAlarm.acknowledge(acknowledgingAlarm.id, ackNote);
    setAckNote("");
    setAcknowledgingAlarm(undefined);
  };

  return (
    <PageShell>
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-surface-elevated to-warning/10 p-6 shadow-panel lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="info">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Simulation Only
            </Badge>
            <h1 className="mt-5 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Alarms
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Simulation-only alarm lifecycle and in-memory event log for synthetic
              scenarios. Acknowledgement here is a demo workflow, not real plant
              alarm handling.
            </p>
          </div>
          <Badge variant={allAlarms.state === "connected" ? "success" : "warning"}>
            {allAlarms.state === "connected" ? "Simulation connected" : "Degraded fallback"}
          </Badge>
        </div>
      </section>

      <AlarmSummaryCards summary={summary} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Alarm Lifecycle Workspace</CardTitle>
                <CardDescription>
                  Active, acknowledged, cleared, and event history views.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={tab === item.id ? "default" : "outline"}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <AlarmFilters
              severity={severity}
              status={status}
              node={node}
              query={query}
              nodeOptions={nodeOptions}
              onSeverityChange={setSeverity}
              onStatusChange={setStatus}
              onNodeChange={setNode}
              onQueryChange={setQuery}
              showStatus={tab !== "events"}
            />
          </CardHeader>
          <CardContent>
            {tab === "events" ? (
              <AlarmEventLog events={filteredEvents} />
            ) : (
              <AlarmRows
                alarms={filteredAlarms}
                onSelect={setSelectedAlarm}
                onAcknowledge={setAcknowledgingAlarm}
              />
            )}
          </CardContent>
        </Card>

        <AlarmDetailsPanel alarm={selectedAlarm} events={relatedEvents} />
      </section>

      {acknowledgingAlarm ? (
        <AcknowledgeDialog
          alarm={acknowledgingAlarm}
          note={ackNote}
          error={acknowledgeAlarm.error}
          pending={acknowledgeAlarm.pendingAlarmId === acknowledgingAlarm.id}
          onNoteChange={setAckNote}
          onCancel={() => {
            setAcknowledgingAlarm(undefined);
            setAckNote("");
          }}
          onConfirm={() => void submitAcknowledge()}
        />
      ) : null}
    </PageShell>
  );
}

function useNodeOptions(alarms: Alarm[], events: AlarmEvent[]) {
  return useMemo(() => {
    const ids = new Set<string>();
    alarms.forEach((alarm) => ids.add(alarm.nodeId || alarm.assetId));
    events.forEach((event) => {
      if (event.nodeId || event.assetId) {
        ids.add(event.nodeId || event.assetId || "");
      }
    });
    return Array.from(ids).filter(Boolean).sort();
  }, [alarms, events]);
}

function isActiveLifecycleAlarm(alarm: Alarm) {
  return alarm.status === "ACTIVE" || alarm.status === "ACKNOWLEDGED";
}

function summarizeAlarms(active: Alarm[], acknowledged: Alarm[], eventCount: number): AlarmSummary {
  return {
    active: active.length,
    unacknowledged: active.filter((alarm) => alarm.status === "ACTIVE").length,
    acknowledged: acknowledged.length,
    critical: active.filter((alarm) => alarm.severity === "CRITICAL" || alarm.severity === "ALARM").length,
    events: eventCount,
  };
}

function filterAlarms(
  alarms: Alarm[],
  filters: {
    severity: "ALL" | AlarmSeverity;
    status: "ALL" | AlarmStatus;
    node: string;
    query: string;
  },
) {
  return alarms.filter((alarm) => {
    const asset = alarm.nodeId || alarm.assetId;
    const searchable = `${alarm.code} ${alarm.title} ${alarm.message} ${asset}`.toLowerCase();
    return (
      (filters.severity === "ALL" || alarm.severity === filters.severity) &&
      (filters.status === "ALL" || alarm.status === filters.status) &&
      (filters.node === "ALL" || asset === filters.node) &&
      (filters.query.trim() === "" || searchable.includes(filters.query.trim().toLowerCase()))
    );
  });
}

function filterEvents(
  events: AlarmEvent[],
  filters: { severity: "ALL" | AlarmSeverity; node: string; query: string },
) {
  return events.filter((event) => {
    const asset = event.nodeId || event.assetId || "";
    const searchable = `${event.type} ${event.code ?? ""} ${event.message} ${asset} ${event.actor ?? ""}`.toLowerCase();
    return (
      (filters.severity === "ALL" || event.severity === filters.severity) &&
      (filters.node === "ALL" || asset === filters.node) &&
      (filters.query.trim() === "" || searchable.includes(filters.query.trim().toLowerCase()))
    );
  });
}
