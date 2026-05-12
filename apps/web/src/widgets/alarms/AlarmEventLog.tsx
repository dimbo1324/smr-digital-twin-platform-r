import {
  alarmEventTypeLabel,
  alarmSeverityTone,
  assetDisplayName,
  formatAlarmDate,
} from "@/entities/alarms/lib/alarmLabels";
import type { AlarmEvent } from "@/entities/alarms/model/types";
import { AlarmEmptyState } from "@/widgets/alarms/AlarmEmptyState";
import { Badge } from "@/shared/ui/badge";

export function AlarmEventLog({ events }: { events: AlarmEvent[] }) {
  if (events.length === 0) {
    return (
      <AlarmEmptyState
        title="No alarm events"
        description="Event history is in-memory and starts filling once scenarios or alarm lifecycle transitions occur."
      />
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={alarmSeverityTone(event.severity)}>{event.severity ?? "INFO"}</Badge>
            <Badge variant="outline">{alarmEventTypeLabel[event.type] ?? event.type}</Badge>
            {event.code ? <span className="font-mono text-xs text-muted-foreground">{event.code}</span> : null}
          </div>
          <p className="mt-3 text-sm text-foreground">{event.message}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{formatAlarmDate(event.createdAt)}</span>
            {event.nodeId || event.assetId ? <span>{assetDisplayName(event.nodeId || event.assetId)}</span> : null}
            {event.actor ? <span>Actor {event.actor}</span> : null}
            {event.scenario ? <span>Scenario {event.scenario}</span> : null}
            {event.note ? <span>Note {event.note}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
