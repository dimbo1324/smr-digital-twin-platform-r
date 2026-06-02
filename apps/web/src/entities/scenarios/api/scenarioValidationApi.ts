import type { components } from "@/shared/api/generated/schema";
import { apiPost } from "@/shared/api/http-client";

export type ScenarioValidationRequest = components["schemas"]["ScenarioValidationRequest"];
export type ScenarioValidationResult = components["schemas"]["ScenarioValidationResult"];

export async function validateScenarioYaml(content: string, signal?: AbortSignal) {
  const response = await apiPost<ScenarioValidationResult, ScenarioValidationRequest>(
    "/api/v1/scenarios/validate",
    { format: "yaml", content },
    {
      requestSchema: "ScenarioValidationRequest",
      responseSchema: "ScenarioValidationResult",
      signal,
    },
  );
  return response.data;
}
