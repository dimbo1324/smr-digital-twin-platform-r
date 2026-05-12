export type AlarmSeverity = "INFO" | "WARNING" | "ALARM" | "CRITICAL";

export type AlarmStatus = "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";

export interface Alarm {
  id: string;
  assetId: string;
  nodeId?: string;
  tag?: string;
  code: string;
  title: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  message: string;
  value: number;
  threshold: number;
  unit: string;
  startedAt: string;
  updatedAt: string;
  createdAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  ackNote?: string;
  clearedAt?: string;
  occurrenceCount: number;
  simulationOnly: boolean;
}

export type AlarmEventType =
  | "ALARM_RAISED"
  | "ALARM_ACKNOWLEDGED"
  | "ALARM_CLEARED"
  | "ALARM_REACTIVATED"
  | "SCENARIO_STARTED"
  | "SCENARIO_STOPPED"
  | "SIMULATION_RESET"
  | "SIMULATION_DEGRADED";

export interface AlarmEvent {
  id: string;
  alarmId?: string;
  type: AlarmEventType;
  assetId?: string;
  nodeId?: string;
  code?: string;
  severity?: AlarmSeverity;
  message: string;
  createdAt: string;
  actor?: string;
  note?: string;
  scenario?: string;
  simulationOnly: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}
