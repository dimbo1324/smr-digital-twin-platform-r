import { beforeEach, describe, expect, it } from "vitest";
import {
  createWorkspaceItem,
  deleteWorkspaceDraft,
  duplicateWorkspaceDraft,
  importScenarioYamlToWorkspace,
  renameWorkspaceDraft,
  saveDraftToWorkspace,
} from "@/features/scenario-authoring/lib/workspace";
import {
  createDraft,
  scenarioDraftToYaml,
  validateScenarioDraft,
} from "@/features/scenario-authoring/lib/scenarioDraft";
import {
  loadScenarioWorkspace,
  saveScenarioWorkspace,
} from "@/features/scenario-authoring/model/workspaceStorage";
import {
  SCENARIO_WORKSPACE_MAX_DRAFTS,
  SCENARIO_WORKSPACE_STORAGE_KEY,
  type ScenarioWorkspaceState,
} from "@/features/scenario-authoring/model/workspaceTypes";

const draft = createDraft({
  id: "workspace_demo",
  name: "Workspace Demo",
  description: "Simulation-only local workspace test draft.",
});

describe("scenario authoring workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty workspace when storage is empty", () => {
    expect(loadScenarioWorkspace().items).toEqual([]);
  });

  it("persists saved drafts in localStorage", () => {
    const item = createWorkspaceItem({
      draft,
      yaml: scenarioDraftToYaml(draft),
      validation: validateScenarioDraft(draft),
      source: "manual",
    });
    const state = saveDraftToWorkspace(emptyState(), item);

    saveScenarioWorkspace(state);

    expect(loadScenarioWorkspace().items[0]?.scenarioId).toBe("workspace_demo");
  });

  it("recovers safely from corrupt JSON", () => {
    window.localStorage.setItem(SCENARIO_WORKSPACE_STORAGE_KEY, "{not json");

    expect(loadScenarioWorkspace()).toEqual({ items: [], schemaVersion: 1 });
    expect(window.localStorage.getItem(SCENARIO_WORKSPACE_STORAGE_KEY)).toBeNull();
  });

  it("renames, duplicates, and deletes drafts", () => {
    const item = createWorkspaceItem({ draft, source: "manual" });
    const renamed = renameWorkspaceDraft(
      saveDraftToWorkspace(emptyState(), item),
      item.draftId,
      "Renamed",
    );
    expect(renamed.items[0]?.name).toBe("Renamed");

    const duplicated = duplicateWorkspaceDraft(renamed, item.draftId);
    expect(duplicated.items).toHaveLength(2);
    expect(duplicated.items[0]?.source).toBe("duplicated");

    const deleted = deleteWorkspaceDraft(duplicated, item.draftId);
    expect(deleted.items).toHaveLength(1);
  });

  it("imports YAML into a local workspace item", () => {
    const yaml = scenarioDraftToYaml(draft);
    const result = importScenarioYamlToWorkspace(emptyState(), yaml);

    expect(result.item?.draft.id).toBe("workspace_demo");
    expect(result.state.items).toHaveLength(1);
    expect(result.item?.source).toBe("imported");
  });

  it("records validation errors for invalid imported YAML", () => {
    const result = importScenarioYamlToWorkspace(emptyState(), "id: BAD ID\nname: Broken");

    expect(result.item?.validation.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("enforces the maximum draft limit", () => {
    let state = emptyState();
    for (let index = 0; index < SCENARIO_WORKSPACE_MAX_DRAFTS; index += 1) {
      state = saveDraftToWorkspace(
        state,
        createWorkspaceItem({
          draft: createDraft({ id: `workspace_demo_${index}`, name: `Workspace Demo ${index}` }),
          source: "manual",
        }),
      );
    }

    const result = importScenarioYamlToWorkspace(state, scenarioDraftToYaml(draft));

    expect(result.errors[0]).toContain("limited");
    expect(result.state.items).toHaveLength(SCENARIO_WORKSPACE_MAX_DRAFTS);
  });
});

function emptyState(): ScenarioWorkspaceState {
  return { items: [], schemaVersion: 1 };
}
