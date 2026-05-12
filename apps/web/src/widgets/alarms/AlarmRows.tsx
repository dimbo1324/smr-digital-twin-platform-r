import { Link } from "react-router-dom";
import {
  alarmSeverityTone,
  alarmStatusLabel,
  alarmStatusTone,
  assetDisplayName,
  formatAlarmDate,
} from "@/entities/alarms/lib/alarmLabels";
import type { Alarm } from "@/entities/alarms/model/types";
import { AlarmEmptyState } from "@/widgets/alarms/AlarmEmptyState";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function AlarmRows({
  alarms,
  onSelect,
  onAcknowledge,
}: {
  alarms: Alarm[];
  onSelect: (alarm: Alarm) => void;
  onAcknowledge: (alarm: Alarm) => void;
}) {
  if (alarms.length === 0) {
    return (
      <AlarmEmptyState
        title="No alarms in this view"
        description="Synthetic alarm lifecycle data is empty for the selected filters."
      />
    );
  }

  return (
    <div className="space-y-3">
      {alarms.map((alarm) => (
        <div
          key={alarm.id}
          className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-4 transition hover:border-primary/30 hover:shadow-panel"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={alarmSeverityTone(alarm.severity)}>{alarm.severity}</Badge>
                <Badge variant={alarmStatusTone(alarm.status)}>
                  {alarmStatusLabel[alarm.status]}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{alarm.code}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{alarm.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{alarm.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{assetDisplayName(alarm.nodeId || alarm.assetId)}</span>
                <span>
                  Value {alarm.value.toFixed(1)} {alarm.unit} / threshold{" "}
                  {alarm.threshold.toFixed(1)} {alarm.unit}
                </span>
                <span>Started {formatAlarmDate(alarm.startedAt)}</span>
                {alarm.acknowledgedBy ? <span>Ack by {alarm.acknowledgedBy}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => onSelect(alarm)}>
                View details
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/process?node=${alarm.nodeId || alarm.assetId}`}>Open in Process</Link>
              </Button>
              {alarm.status === "ACTIVE" ? (
                <Button type="button" size="sm" onClick={() => onAcknowledge(alarm)}>
                  Acknowledge
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
