import type { Alarm, AlarmAcknowledgeRequest, AlarmInstance } from "@/entities/alarms/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function getActiveAlarms(): Promise<Alarm[]> {
  const response = await apiGet<AlarmInstance[]>("/api/v1/alarms/active");
  return response.data.map(toAlarm);
}

export async function getAlarmHistory(): Promise<Alarm[]> {
  const response = await apiGet<AlarmInstance[]>("/api/v1/alarms/history");
  return response.data.map(toAlarm);
}

export async function acknowledgeAlarm(
  id: string,
  payload: AlarmAcknowledgeRequest = {},
): Promise<Alarm> {
  const response = await apiPost<AlarmInstance>(`/api/v1/alarms/${encodeURIComponent(id)}/acknowledge`, {
    acknowledgedBy: payload.acknowledgedBy ?? "demo-operator",
    comment: payload.comment ?? "Acknowledged from Alarms page",
  });
  return toAlarm(response.data);
}

function toAlarm(alarm: AlarmInstance): Alarm {
  return {
    ...alarm,
    createdAt: alarm.startedAt,
  };
}
