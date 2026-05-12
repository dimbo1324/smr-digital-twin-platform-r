import { FileClock } from "lucide-react";
import {
  alarmEventTypeLabel,
  alarmStatusLabel,
  alarmStatusTone,
  assetDisplayName,
  formatAlarmDate,
} from "@/entities/alarms/lib/alarmLabels";
import type { Alarm, AlarmEvent } from "@/entities/alarms/model/types";
import { AlarmEmptyState } from "@/widgets/alarms/AlarmEmptyState";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function AlarmDetailsPanel({
  alarm,
  events,
}: {
  alarm?: Alarm;
  events: AlarmEvent[];
}) {
  if (!alarm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alarm Details</CardTitle>
          <CardDescription>Select an alarm to inspect lifecycle metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlarmEmptyState
            title="No alarm selected"
            description="Details, acknowledgement metadata, and related event history will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{alarm.title}</CardTitle>
            <CardDescription>{alarm.code}</CardDescription>
          </div>
          <Badge variant={alarmStatusTone(alarm.status)}>{alarmStatusLabel[alarm.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Severity" value={alarm.severity} />
          <Detail label="Node" value={assetDisplayName(alarm.nodeId || alarm.assetId)} />
          <Detail label="Started" value={formatAlarmDate(alarm.startedAt)} />
          <Detail label="Updated" value={formatAlarmDate(alarm.updatedAt)} />
          <Detail label="Value" value={`${alarm.value.toFixed(2)} ${alarm.unit}`} />
          <Detail label="Threshold" value={`${alarm.threshold.toFixed(2)} ${alarm.unit}`} />
          <Detail label="Occurrences" value={String(alarm.occurrenceCount)} />
          <Detail label="Cleared" value={formatAlarmDate(alarm.clearedAt)} />
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-3">
          <p className="text-xs text-muted-foreground">Message</p>
          <p className="mt-1 text-sm text-foreground">{alarm.message}</p>
        </div>
        {alarm.acknowledgedBy ? (
          <div className="rounded-2xl border border-info/25 bg-info/10 p-3">
            <p className="text-sm font-medium text-foreground">
              Acknowledged by {alarm.acknowledgedBy}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatAlarmDate(alarm.acknowledgedAt)}
              {alarm.ackNote ? ` · ${alarm.ackNote}` : ""}
            </p>
          </div>
        ) : null}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <FileClock className="h-4 w-4" aria-hidden="true" />
            Related events
          </p>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-2xl border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{alarmEventTypeLabel[event.type]}</span>
                  <span> · {formatAlarmDate(event.createdAt)}</span>
                  {event.note ? <p className="mt-1">{event.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
              No related events in the current event window.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
