import type { Alarm, AlarmSeverity } from "@/entities/alarms/model/types";
import type { CommandRecord, CommandStatus } from "@/entities/commands/model/types";
import type { EventRecord, EventSeverity } from "@/entities/events/model/types";
import type { TelemetryDisplayPoint, TelemetryQuality } from "@/entities/telemetry/model/types";
import { TREND_TELEMETRY_TAGS } from "@/entities/telemetry/model/processTags";
import { sortByTimestampDesc } from "@/shared/lib/time";

export const dashboardTelemetryTags = [
  ...TREND_TELEMETRY_TAGS,
  { tag: "LT-101", label: "Tank Level" },
  { tag: "V-101.POS", label: "Valve Position" },
  { tag: "P-101.STATE", label: "Pump State" },
] as const;

const severityRank: Record<string, number> = {
  CRITICAL: 5,
  ERROR: 4,
  HIGH: 4,
  WARNING: 3,
  ALARM: 3,
  INFO: 0,
};

export function newestAlarm(alarms: Alarm[]): Alarm | undefined {
  return sortByTimestampDesc(alarms, (alarm) => alarm.activeAt ?? alarm.createdAt)[0];
}

export function newestCommand(commands: CommandRecord[]): CommandRecord | undefined {
  return sortByTimestampDesc(commands, commandTimestamp)[0];
}

export function newestEvents(events: EventRecord[]): EventRecord[] {
  return sortByTimestampDesc(events, (event) => event.timestamp);
}

export function commandTimestamp(command: CommandRecord): string {
  return command.completedAt ?? command.acceptedAt ?? command.rejectedAt ?? command.requestedAt;
}

export function highestAlarmSeverity(alarms: Alarm[]): AlarmSeverity | undefined {
  return [...alarms].sort(
    (left, right) => (severityRank[right.severity] ?? 0) - (severityRank[left.severity] ?? 0),
  )[0]?.severity;
}

export function telemetrySource(point: TelemetryDisplayPoint): string {
  if (point.source === "simulation") {
    return "Simulation / Synthetic";
  }

  if (point.source?.includes("mock")) {
    return "Mock";
  }

  return point.source ?? "Fallback";
}

export function apiLabel(status: string): string {
  if (status === "ok" || status === "connected") {
    return "Connected";
  }

  if (status === "checking") {
    return "Checking";
  }

  return "Offline";
}

export function dataSourceLabel(source: string): string {
  switch (source) {
    case "synthetic_simulation":
      return "Synthetic simulation";
    case "in_memory_fallback":
      return "In-memory fallback";
    default:
      return source;
  }
}

export function qualityBadge(quality: TelemetryQuality | undefined) {
  if (quality === "GOOD") {
    return "success";
  }

  if (quality === "UNCERTAIN") {
    return "warning";
  }

  return "offline";
}

export function alarmBadge(severity: string) {
  if (severity === "CRITICAL" || severity === "HIGH" || severity === "ALARM") {
    return "destructive";
  }

  if (severity === "WARNING") {
    return "warning";
  }

  return "secondary";
}

export function commandBadge(status: CommandStatus) {
  if (status === "COMPLETED" || status === "ACCEPTED") {
    return "success";
  }

  if (status === "FAILED" || status === "REJECTED") {
    return "destructive";
  }

  return "warning";
}

export function eventBadge(severity: EventSeverity) {
  if (severity === "CRITICAL" || severity === "ERROR") {
    return "destructive";
  }

  if (severity === "WARNING") {
    return "warning";
  }

  return "secondary";
}
