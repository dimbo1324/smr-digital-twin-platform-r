export type AlarmSeverity = "LOW" | "MEDIUM" | "HIGH" | "ALARM" | "WARNING" | "INFO" | "CRITICAL";

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
