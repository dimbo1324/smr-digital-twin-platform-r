import type { Alarm, AlarmSeverity } from "@/entities/alarms/model/types";
import type { CommandRecord } from "@/entities/commands/model/types";
import type { EventRecord } from "@/entities/events/model/types";
import { TREND_TELEMETRY_TAGS } from "@/entities/telemetry/model/processTags";
import { sortByTimestampDesc } from "@/shared/lib/time";
import { commandTimestamp } from "./formatters";
import { alarmSeverityRank } from "./statusLabels";

export const dashboardTelemetryTags = [
  ...TREND_TELEMETRY_TAGS,
  { tag: "LT-101", label: "Tank Level" },
  { tag: "V-101.POS", label: "Valve Position" },
  { tag: "P-101.STATE", label: "Pump State" },
] as const;

export function newestAlarm(alarms: Alarm[]): Alarm | undefined {
  return sortByTimestampDesc(alarms, (alarm) => alarm.activeAt ?? alarm.createdAt)[0];
}

export function newestCommand(commands: CommandRecord[]): CommandRecord | undefined {
  return sortByTimestampDesc(commands, commandTimestamp)[0];
}

export function newestEvents(events: EventRecord[]): EventRecord[] {
  return sortByTimestampDesc(events, (event) => event.timestamp);
}

export function highestAlarmSeverity(alarms: Alarm[]): AlarmSeverity | undefined {
  return [...alarms].sort(
    (left, right) => (alarmSeverityRank[right.severity] ?? 0) - (alarmSeverityRank[left.severity] ?? 0),
  )[0]?.severity;
}
