import type { SimulationScenario, SimulationStatus } from "@/entities/simulation/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

export async function getScenarios(signal?: AbortSignal): Promise<SimulationScenario[]> {
  const response = await apiGet<SimulationScenario[]>("/api/v1/simulation/scenarios", {
    signal,
    responseSchema: "ScenarioList",
  });
  return response.data;
}

export async function startScenario(name: string): Promise<SimulationStatus> {
  const response = await apiPost<SimulationStatus>(
    `/api/v1/simulation/scenarios/${encodeURIComponent(name)}/start`,
    undefined,
    { responseSchema: "SimulationStatus" },
  );
  return response.data;
}

export async function stopScenario(): Promise<SimulationStatus> {
  const response = await apiPost<SimulationStatus>("/api/v1/simulation/scenarios/stop", undefined, {
    responseSchema: "SimulationStatus",
  });
  return response.data;
}

export async function resetSimulation(): Promise<SimulationStatus> {
  const response = await apiPost<SimulationStatus>("/api/v1/simulation/reset", undefined, {
    responseSchema: "SimulationStatus",
  });
  return response.data;
}
