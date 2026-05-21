import type { MQTTStatus } from "@/entities/mqtt/model/types";
import { apiGet } from "@/shared/api/client";

export async function getMqttStatus(signal?: AbortSignal): Promise<MQTTStatus> {
  const response = await apiGet<MQTTStatus>("/api/v1/mqtt/status", {
    signal,
    responseSchema: "MQTTStatus",
  });
  return response.data;
}
