import type {
  ScenarioDraft,
  ScenarioValidationResult,
} from "@/features/scenario-authoring/lib/scenarioDraft";

export const SCENARIO_WORKSPACE_STORAGE_KEY = "smr.scenarioAuthoring.workspace.v1";
export const SCENARIO_WORKSPACE_SCHEMA_VERSION = 1;
export const SCENARIO_WORKSPACE_MAX_DRAFTS = 50;
export const SCENARIO_WORKSPACE_MAX_YAML_BYTES = 64 * 1024;

export type ScenarioWorkspaceSource = "template" | "imported" | "duplicated" | "manual";

export interface ScenarioDraftWorkspaceItem {
  id: string;
  draftId: string;
  name: string;
  scenarioId: string;
  description?: string;
  yaml: string;
  draft: ScenarioDraft;
  validation: ScenarioValidationResult & {
    lastValidatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  source: ScenarioWorkspaceSource;
  version: number;
}

export interface ScenarioWorkspaceState {
  items: ScenarioDraftWorkspaceItem[];
  activeDraftId?: string;
  schemaVersion: number;
}
