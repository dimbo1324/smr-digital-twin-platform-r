import type { ControlStatus, ModeChangeRequest } from "@/entities/control/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function getControlStatus(signal?: AbortSignal): Promise<ControlStatus> {
  const response = await apiGet<ControlStatus>("/api/v1/control/status", {
    signal,
    responseSchema: "ControlStatus",
  });
  return response.data;
}

export async function setControlMode(request: ModeChangeRequest): Promise<ControlStatus> {
  const response = await apiPost<ControlStatus, ModeChangeRequest>(
    "/api/v1/control/mode",
    {
      requestedBy: "demo-operator",
      reason: defaultModeReason(request.mode),
      ...request,
    },
    {
      requestSchema: "ModeChangeRequest",
      responseSchema: "ControlStatus",
    },
  );
  return response.data;
}

function defaultModeReason(mode: ModeChangeRequest["mode"]) {
  switch (mode) {
    case "AUTO":
      return "Prepare for future simulated PID control";
    case "DISABLED":
      return "Disable simulation control output";
    default:
      return "Return to operator manual control";
  }
}
