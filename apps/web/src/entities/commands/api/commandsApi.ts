import type { CommandRecord, CommandRequest } from "@/entities/commands/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function sendCommand(request: CommandRequest): Promise<CommandRecord> {
  const response = await apiPost<CommandRecord, CommandRequest>("/api/v1/commands", {
    ...request,
    source: "frontend",
    requestedBy: "demo-engineer",
    payload: {
      reason: "operator_demo",
      ...request.payload,
    },
  });
  return response.data;
}

export async function getRecentCommands(signal?: AbortSignal): Promise<CommandRecord[]> {
  const response = await apiGet<CommandRecord[]>("/api/v1/commands/recent", { signal });
  return response.data;
}
