import type { EventRecord } from "@/entities/events/model/types";
import { apiGet } from "@/shared/api/client";

export async function getRecentEvents(): Promise<EventRecord[]> {
  const response = await apiGet<EventRecord[]>("/api/v1/events/recent");
  return response.data;
}
