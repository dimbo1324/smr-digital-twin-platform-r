import type { CommandRecord, CommandRequest, SimulationEvent } from "@/entities/commands/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function sendCommand(request: CommandRequest): Promise<CommandRecord> {
  const response = await apiPost<CommandRecord>("/api/v1/commands", {
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

export async function getRecentCommands(): Promise<CommandRecord[]> {
  const response = await apiGet<CommandRecord[]>("/api/v1/commands/recent");
  return response.data;
}

export async function getRecentEvents(): Promise<SimulationEvent[]> {
  const response = await apiGet<SimulationEvent[]>("/api/v1/events/recent");
  return response.data;
}
