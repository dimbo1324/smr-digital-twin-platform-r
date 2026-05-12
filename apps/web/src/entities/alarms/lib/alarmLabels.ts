import type { AlarmEventType, AlarmSeverity, AlarmStatus } from "@/entities/alarms/model/types";
import type { BadgeProps } from "@/shared/ui/badge";

export const alarmStatusLabel: Record<AlarmStatus, string> = {
  ACTIVE: "Active",
  ACKNOWLEDGED: "Acknowledged",
  CLEARED: "Cleared",
};

export const alarmSeverityLabel: Record<AlarmSeverity, string> = {
  INFO: "Info",
  WARNING: "Warning",
  ALARM: "Alarm",
  CRITICAL: "Critical",
};

export const alarmEventTypeLabel: Record<AlarmEventType, string> = {
  ALARM_RAISED: "Alarm raised",
  ALARM_ACKNOWLEDGED: "Alarm acknowledged",
  ALARM_CLEARED: "Alarm cleared",
  ALARM_REACTIVATED: "Alarm reactivated",
  SCENARIO_STARTED: "Scenario started",
  SCENARIO_STOPPED: "Scenario stopped",
  SIMULATION_RESET: "Simulation reset",
  SIMULATION_DEGRADED: "Simulation degraded",
};

export const nodeNameById: Record<string, string> = {
  "reactor-core": "Reactor Core",
  "primary-loop": "Primary Loop",
  "steam-generator": "Steam Generator",
  turbine: "Turbine",
  generator: "Generator",
  condenser: "Condenser",
  "feedwater-system": "Feedwater System",
  "protection-system": "Protection System",
};

export function alarmStatusTone(status: string): BadgeProps["variant"] {
  switch (status) {
    case "ACTIVE":
      return "warning";
    case "ACKNOWLEDGED":
      return "info";
    case "CLEARED":
      return "success";
    default:
      return "outline";
  }
}

export function alarmSeverityTone(severity?: string): BadgeProps["variant"] {
  switch (severity) {
    case "CRITICAL":
    case "ALARM":
      return "destructive";
    case "WARNING":
      return "warning";
    case "INFO":
      return "info";
    default:
      return "outline";
  }
}

export function formatAlarmDate(value?: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function assetDisplayName(assetId?: string, fallback = "Unknown") {
  if (!assetId) {
    return fallback;
  }
  return nodeNameById[assetId] ?? assetId;
}
