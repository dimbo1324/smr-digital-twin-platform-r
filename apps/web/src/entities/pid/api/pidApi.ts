import type { PIDConfigUpdateRequest, PIDStatus } from "@/entities/pid/model/types";
import { apiGet, apiPatch } from "@/shared/api/client";

export async function getPidStatus(signal?: AbortSignal): Promise<PIDStatus> {
  const response = await apiGet<PIDStatus>("/api/v1/pid/status", {
    signal,
    responseSchema: "PIDStatus",
  });
  return response.data;
}

export async function updatePidConfig(request: PIDConfigUpdateRequest): Promise<PIDStatus> {
  const response = await apiPatch<PIDStatus, PIDConfigUpdateRequest>(
    "/api/v1/pid/config",
    {
      reason: "Tune synthetic TIC-101 PID loop",
      ...request,
    },
    {
      requestSchema: "PIDConfigUpdateRequest",
      responseSchema: "PIDStatus",
    },
  );
  return response.data;
}
