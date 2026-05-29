import type { CommandRecord, CommandRequest } from "@/entities/commands/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function sendCommand(request: CommandRequest): Promise<CommandRecord> {
  const commandRequest = {
    ...request,
    source: "frontend",
    payload: {
      reason: "operator_demo",
      ...request.payload,
    },
  };
  const response = await apiPost<CommandRecord, CommandRequest>(
    "/api/v1/commands",
    commandRequest,
    {
      requestSchema: "CommandRequest",
      responseSchema: "Command",
    },
  );
  return response.data;
}

export async function getRecentCommands(
  signal?: AbortSignal,
  limit = 50,
): Promise<CommandRecord[]> {
  const response = await apiGet<CommandRecord[]>(`/api/v1/commands/recent?limit=${limit}`, {
    signal,
    responseSchema: "CommandList",
  });
  return response.data;
}
