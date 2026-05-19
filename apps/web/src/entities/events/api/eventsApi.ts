import type { EventRecord } from "@/entities/events/model/types";
import { apiGet } from "@/shared/api/client";

export async function getRecentEvents(signal?: AbortSignal, limit = 50): Promise<EventRecord[]> {
  const response = await apiGet<EventRecord[]>(`/api/v1/events/recent?limit=${limit}`, {
    signal,
    responseSchema: "EventList",
  });
  return response.data;
}
