export type AlarmSeverity = "LOW" | "MEDIUM" | "HIGH" | "ALARM" | "WARNING" | "INFO" | "CRITICAL";

export type AlarmStatus = "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";

export interface Alarm {
  id: string;
  ruleId?: string;
  tag: string;
  assetId?: string;
  code?: string;
  title?: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  message: string;
  createdAt: string;
  activeAt?: string;
  updatedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  clearedAt?: string;
  value?: number;
  lastValue?: number;
  threshold?: number;
  unit?: string;
  source?: string;
  metadata?: Record<string, string>;
}

export interface AlarmAcknowledgeRequest {
  acknowledgedBy?: string;
  comment?: string;
}
