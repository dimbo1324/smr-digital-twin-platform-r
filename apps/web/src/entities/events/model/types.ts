export type EventSeverity = "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";

export interface EventRecord {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  severity: EventSeverity;
  targetTag?: string;
  commandId?: string;
  alarmId?: string;
  message: string;
  metadata?: Record<string, string>;
}
