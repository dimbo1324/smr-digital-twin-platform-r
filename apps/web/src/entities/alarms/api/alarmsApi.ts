import type { Alarm, AlarmAcknowledgeRequest, AlarmInstance } from "@/entities/alarms/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function getActiveAlarms(signal?: AbortSignal): Promise<Alarm[]> {
  const response = await apiGet<AlarmInstance[]>("/api/v1/alarms/active", {
    signal,
    responseSchema: "AlarmInstanceList",
  });
  return response.data.map(toAlarm);
}

export async function getAlarmHistory(signal?: AbortSignal): Promise<Alarm[]> {
  const response = await apiGet<AlarmInstance[]>("/api/v1/alarms/history", {
    signal,
    responseSchema: "AlarmInstanceList",
  });
  return response.data.map(toAlarm);
}

export async function acknowledgeAlarm(
  id: string,
  payload: AlarmAcknowledgeRequest = {},
): Promise<Alarm> {
  const acknowledgeRequest = {
    comment: payload.comment ?? "Acknowledged from Alarms page",
    ...payload,
  };
  const response = await apiPost<AlarmInstance, AlarmAcknowledgeRequest>(
    `/api/v1/alarms/${encodeURIComponent(id)}/acknowledge`,
    acknowledgeRequest,
    {
      requestSchema: "AcknowledgeAlarmRequest",
      responseSchema: "AlarmInstance",
    },
  );
  return toAlarm(response.data);
}

function toAlarm(alarm: AlarmInstance): Alarm {
  return {
    ...alarm,
    createdAt: alarm.startedAt,
  };
}
