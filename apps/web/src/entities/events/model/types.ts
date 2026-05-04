export type EventSeverity = "INFO" | "NOTICE" | "WARNING";

export interface EventRecord {
  id: string;
  timestamp: string;
  severity: EventSeverity;
  source: string;
  type: string;
  message: string;
}
