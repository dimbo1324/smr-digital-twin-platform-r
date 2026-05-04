export type AlarmSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlarmStatus = "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";

export interface Alarm {
  id: string;
  tag: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  message: string;
  createdAt: string;
  acknowledgedBy?: string;
  clearedAt?: string;
}
