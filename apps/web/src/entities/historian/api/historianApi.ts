import type { HistorianStatus } from "@/entities/historian/model/types";
import { apiGet } from "@/shared/api/client";

export async function getHistorianStatus(signal?: AbortSignal): Promise<HistorianStatus> {
  const response = await apiGet<HistorianStatus>("/api/v1/historian/status", {
    signal,
    responseSchema: "HistorianStatus",
  });
  return response.data;
}
