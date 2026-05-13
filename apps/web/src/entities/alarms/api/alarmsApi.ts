import type { Alarm, AlarmAcknowledgeRequest } from "@/entities/alarms/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

interface ApiAlarm {
  id: string;
  ruleId?: string;
  assetId: string;
  tag?: string;
  code: string;
  title: string;
  message: string;
  severity: Alarm["severity"];
  status: Alarm["status"];
  value: number;
  lastValue?: number;
  threshold: number;
  unit: string;
  source?: string;
  startedAt: string;
  activeAt?: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  clearedAt?: string;
  metadata?: Record<string, string>;
}

export async function getActiveAlarms(): Promise<Alarm[]> {
  const response = await apiGet<ApiAlarm[]>("/api/v1/alarms/active");
  return response.data.map(toAlarm);
}

export async function getAlarmHistory(): Promise<Alarm[]> {
  const response = await apiGet<ApiAlarm[]>("/api/v1/alarms/history");
  return response.data.map(toAlarm);
}

export async function acknowledgeAlarm(
  id: string,
  payload: AlarmAcknowledgeRequest = {},
): Promise<Alarm> {
  const response = await apiPost<ApiAlarm>(`/api/v1/alarms/${encodeURIComponent(id)}/acknowledge`, {
    acknowledgedBy: payload.acknowledgedBy ?? "demo-operator",
    comment: payload.comment ?? "Acknowledged from Alarms page",
  });
  return toAlarm(response.data);
}

function toAlarm(alarm: ApiAlarm): Alarm {
  return {
    id: alarm.id,
    ruleId: alarm.ruleId,
    tag: alarm.tag ?? alarm.assetId,
    assetId: alarm.assetId,
    code: alarm.code,
    title: alarm.title,
    severity: alarm.severity,
    status: alarm.status,
    message: alarm.message,
    createdAt: alarm.startedAt,
    activeAt: alarm.activeAt ?? alarm.startedAt,
    updatedAt: alarm.updatedAt,
    acknowledgedAt: alarm.acknowledgedAt,
    acknowledgedBy: alarm.acknowledgedBy,
    clearedAt: alarm.clearedAt,
    value: alarm.value,
    lastValue: alarm.lastValue ?? alarm.value,
    threshold: alarm.threshold,
    unit: alarm.unit,
    source: alarm.source,
    metadata: alarm.metadata,
  };
}
