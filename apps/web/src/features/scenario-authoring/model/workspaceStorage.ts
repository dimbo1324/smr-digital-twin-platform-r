import {
  SCENARIO_WORKSPACE_MAX_DRAFTS,
  SCENARIO_WORKSPACE_SCHEMA_VERSION,
  SCENARIO_WORKSPACE_STORAGE_KEY,
  type ScenarioDraftWorkspaceItem,
  type ScenarioWorkspaceState,
} from "@/features/scenario-authoring/model/workspaceTypes";

const emptyWorkspace: ScenarioWorkspaceState = {
  items: [],
  schemaVersion: SCENARIO_WORKSPACE_SCHEMA_VERSION,
};

export function createEmptyScenarioWorkspace(): ScenarioWorkspaceState {
  return { ...emptyWorkspace, items: [] };
}

export function loadScenarioWorkspace(
  storage: Pick<Storage, "getItem" | "removeItem"> | undefined = safeLocalStorage(),
): ScenarioWorkspaceState {
  if (!storage) {
    return createEmptyScenarioWorkspace();
  }

  const raw = storage.getItem(SCENARIO_WORKSPACE_STORAGE_KEY);
  if (!raw) {
    return createEmptyScenarioWorkspace();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ScenarioWorkspaceState>;
    if (
      parsed.schemaVersion !== SCENARIO_WORKSPACE_SCHEMA_VERSION ||
      !Array.isArray(parsed.items)
    ) {
      storage.removeItem(SCENARIO_WORKSPACE_STORAGE_KEY);
      return createEmptyScenarioWorkspace();
    }

    const items = parsed.items.filter(isWorkspaceItem).slice(0, SCENARIO_WORKSPACE_MAX_DRAFTS);
    const activeDraftId =
      typeof parsed.activeDraftId === "string" &&
      items.some((item) => item.draftId === parsed.activeDraftId)
        ? parsed.activeDraftId
        : undefined;

    return {
      schemaVersion: SCENARIO_WORKSPACE_SCHEMA_VERSION,
      items,
      activeDraftId,
    };
  } catch {
    storage.removeItem(SCENARIO_WORKSPACE_STORAGE_KEY);
    return createEmptyScenarioWorkspace();
  }
}

export function saveScenarioWorkspace(
  state: ScenarioWorkspaceState,
  storage: Pick<Storage, "setItem"> | undefined = safeLocalStorage(),
) {
  if (!storage) {
    return;
  }

  storage.setItem(
    SCENARIO_WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: SCENARIO_WORKSPACE_SCHEMA_VERSION,
      activeDraftId: state.activeDraftId,
      items: state.items.slice(0, SCENARIO_WORKSPACE_MAX_DRAFTS),
    }),
  );
}

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isWorkspaceItem(value: unknown): value is ScenarioDraftWorkspaceItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ScenarioDraftWorkspaceItem>;
  return (
    typeof item.id === "string" &&
    typeof item.draftId === "string" &&
    typeof item.name === "string" &&
    typeof item.scenarioId === "string" &&
    typeof item.yaml === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string" &&
    typeof item.version === "number" &&
    Boolean(item.draft) &&
    Boolean(item.validation)
  );
}
