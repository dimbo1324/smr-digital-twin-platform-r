import type { AlarmSeverity } from "@/entities/alarms/model/types";
import type { CommandStatus } from "@/entities/commands/model/types";
import type { EventSeverity } from "@/entities/events/model/types";
import type { TelemetryQuality } from "@/entities/telemetry/model/types";

export type DashboardBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "info"
  | "mock"
  | "offline";

export const alarmSeverityRank: Record<string, number> = {
  CRITICAL: 5,
  ERROR: 4,
  HIGH: 4,
  WARNING: 3,
  ALARM: 3,
  INFO: 0,
};

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

export function qualityBadge(quality: TelemetryQuality | undefined): DashboardBadgeVariant {
  if (quality === "GOOD") {
    return "success";
  }

  if (quality === "UNCERTAIN") {
    return "warning";
  }

  return "offline";
}

export function alarmBadge(severity: AlarmSeverity | string): DashboardBadgeVariant {
  if (severity === "CRITICAL" || severity === "HIGH" || severity === "ALARM") {
    return "destructive";
  }

  if (severity === "WARNING") {
    return "warning";
  }

  return "secondary";
}

export function commandBadge(status: CommandStatus): DashboardBadgeVariant {
  if (status === "COMPLETED" || status === "ACCEPTED") {
    return "success";
  }

  if (status === "FAILED" || status === "REJECTED") {
    return "destructive";
  }

  return "warning";
}

export function eventBadge(severity: EventSeverity): DashboardBadgeVariant {
  if (severity === "CRITICAL" || severity === "ERROR") {
    return "destructive";
  }

  if (severity === "WARNING") {
    return "warning";
  }

  return "secondary";
}
