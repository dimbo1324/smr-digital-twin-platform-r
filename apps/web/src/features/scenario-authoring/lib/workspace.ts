import {
  createDraft,
  scenarioBehaviorOptions,
  scenarioDraftToYaml,
  scenarioSeverityOptions,
  validateScenarioDraft,
  type ScenarioBehavior,
  type ScenarioDraft,
  type ScenarioEffectsDraft,
  type ScenarioValidationResult,
} from "@/features/scenario-authoring/lib/scenarioDraft";
import {
  SCENARIO_WORKSPACE_MAX_DRAFTS,
  SCENARIO_WORKSPACE_MAX_YAML_BYTES,
  SCENARIO_WORKSPACE_SCHEMA_VERSION,
  type ScenarioDraftWorkspaceItem,
  type ScenarioWorkspaceSource,
  type ScenarioWorkspaceState,
} from "@/features/scenario-authoring/model/workspaceTypes";

const listKeys = new Set(["tags", "expectedAlarms", "reportTags"]);
const topLevelKeys = new Set([
  "id",
  "name",
  "description",
  "category",
  "severity",
  "duration",
  "tags",
  "expectedAlarms",
  "reportTags",
  "safetyNote",
  "enabled",
  "version",
  "effects",
]);
const effectKeys = new Set<keyof ScenarioEffectsDraft>([
  "behavior",
  "mode",
  "targetPowerPct",
  "amplitudePct",
  "periodTicks",
  "primaryTemperatureC",
  "primaryTemperatureBaseC",
  "primaryTemperatureDriftPerTickC",
  "primaryTemperatureMaxDriftC",
  "primaryPressureMPa",
  "flowPct",
  "levelPct",
]);

export function createWorkspaceItem({
  draft,
  yaml = scenarioDraftToYaml(draft),
  validation,
  source,
  name,
}: {
  draft: ScenarioDraft;
  yaml?: string;
  validation?: ScenarioValidationResult;
  source: ScenarioWorkspaceSource;
  name?: string;
}): ScenarioDraftWorkspaceItem {
  const now = new Date().toISOString();
  const resolvedValidation = validation ?? validateScenarioDraft(draft);
  const draftId = createId("draft");

  return {
    id: createId("item"),
    draftId,
    name: name?.trim() || draft.name || draft.id || "Scenario draft",
    scenarioId: draft.id,
    description: draft.description,
    yaml,
    draft: cloneScenarioDraft(draft),
    validation: {
      ...resolvedValidation,
      lastValidatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    source,
    version: 1,
  };
}

export function saveDraftToWorkspace(
  state: ScenarioWorkspaceState,
  item: ScenarioDraftWorkspaceItem,
): ScenarioWorkspaceState {
  const existingIndex = state.items.findIndex((candidate) => candidate.draftId === item.draftId);
  const nextItems =
    existingIndex >= 0
      ? state.items.map((candidate, index) => (index === existingIndex ? item : candidate))
      : [item, ...state.items].slice(0, SCENARIO_WORKSPACE_MAX_DRAFTS);

  return {
    schemaVersion: SCENARIO_WORKSPACE_SCHEMA_VERSION,
    activeDraftId: item.draftId,
    items: nextItems,
  };
}

export function updateWorkspaceItemFromDraft({
  item,
  draft,
  yaml,
  validation,
}: {
  item: ScenarioDraftWorkspaceItem;
  draft: ScenarioDraft;
  yaml: string;
  validation: ScenarioValidationResult;
}): ScenarioDraftWorkspaceItem {
  return {
    ...item,
    name: item.name.trim() || draft.name,
    scenarioId: draft.id,
    description: draft.description,
    yaml,
    draft: cloneScenarioDraft(draft),
    validation: {
      ...validation,
      lastValidatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function renameWorkspaceDraft(
  state: ScenarioWorkspaceState,
  draftId: string,
  name: string,
): ScenarioWorkspaceState {
  const nextName = name.trim();
  if (!nextName) {
    return state;
  }

  return {
    ...state,
    items: state.items.map((item) =>
      item.draftId === draftId
        ? { ...item, name: nextName, updatedAt: new Date().toISOString() }
        : item,
    ),
  };
}

export function duplicateWorkspaceDraft(
  state: ScenarioWorkspaceState,
  draftId: string,
): ScenarioWorkspaceState {
  const source = state.items.find((item) => item.draftId === draftId);
  if (!source || state.items.length >= SCENARIO_WORKSPACE_MAX_DRAFTS) {
    return state;
  }

  const duplicate = createWorkspaceItem({
    draft: {
      ...cloneScenarioDraft(source.draft),
      id: `${source.draft.id}_copy`.replace(/[^a-z0-9_]+/g, "_"),
      name: `${source.draft.name} Copy`,
    },
    source: "duplicated",
    name: `${source.name} Copy`,
  });

  return saveDraftToWorkspace(state, duplicate);
}

export function deleteWorkspaceDraft(
  state: ScenarioWorkspaceState,
  draftId: string,
): ScenarioWorkspaceState {
  const nextItems = state.items.filter((item) => item.draftId !== draftId);
  return {
    schemaVersion: SCENARIO_WORKSPACE_SCHEMA_VERSION,
    items: nextItems,
    activeDraftId: state.activeDraftId === draftId ? nextItems[0]?.draftId : state.activeDraftId,
  };
}

export function markWorkspaceDraftStale(
  state: ScenarioWorkspaceState,
  draftId: string | undefined,
): ScenarioWorkspaceState {
  if (!draftId) {
    return state;
  }

  return {
    ...state,
    items: state.items.map((item) =>
      item.draftId === draftId
        ? {
            ...item,
            validation: {
              ...item.validation,
              warnings: uniqueMessages([
                ...item.validation.warnings,
                "Draft has been modified since the last saved validation.",
              ]),
            },
          }
        : item,
    ),
  };
}

export function importScenarioYamlToWorkspace(
  state: ScenarioWorkspaceState,
  yaml: string,
  existingScenarioIds: string[] = [],
): { state: ScenarioWorkspaceState; item?: ScenarioDraftWorkspaceItem; errors: string[] } {
  if (encodedSize(yaml) > SCENARIO_WORKSPACE_MAX_YAML_BYTES) {
    return {
      state,
      errors: [`YAML draft is larger than ${SCENARIO_WORKSPACE_MAX_YAML_BYTES / 1024} KB.`],
    };
  }
  if (state.items.length >= SCENARIO_WORKSPACE_MAX_DRAFTS) {
    return { state, errors: [`Workspace is limited to ${SCENARIO_WORKSPACE_MAX_DRAFTS} drafts.`] };
  }

  const parsed = parseScenarioYamlDraft(yaml);
  const validation = validateScenarioDraft(parsed.draft, existingScenarioIds);
  const mergedValidation: ScenarioValidationResult = {
    valid: parsed.errors.length === 0 && validation.valid,
    errors: uniqueMessages([...parsed.errors, ...validation.errors]),
    warnings: uniqueMessages([...parsed.warnings, ...validation.warnings]),
  };
  const item = createWorkspaceItem({
    draft: parsed.draft,
    yaml,
    validation: mergedValidation,
    source: "imported",
  });

  return {
    state: saveDraftToWorkspace(state, item),
    item,
    errors: mergedValidation.errors,
  };
}

export function parseScenarioYamlDraft(yaml: string): {
  draft: ScenarioDraft;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const draft = createDraft({
    id: "",
    name: "",
    description: "",
    category: "",
    duration: "",
    tags: [],
    expectedAlarms: [],
    reportTags: [],
    safetyNote: "",
    effects: { behavior: "nominal", mode: "NORMAL" },
  });
  draft.effects = { behavior: "nominal", mode: "NORMAL" };
  let currentList: "tags" | "expectedAlarms" | "reportTags" | undefined;
  let inEffects = false;

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (currentList && trimmed.startsWith("- ")) {
      draft[currentList] = [...draft[currentList], unquoteYaml(trimmed.slice(2).trim())];
      continue;
    }

    currentList = undefined;

    const match = /^([A-Za-z][A-Za-z0-9]*):(?:\s*(.*))?$/.exec(trimmed);
    const nestedMatch = /^\s{2}([A-Za-z][A-Za-z0-9]*):(?:\s*(.*))?$/.exec(line);
    if (inEffects && nestedMatch) {
      const key = nestedMatch[1] as keyof ScenarioEffectsDraft;
      const rawValue = nestedMatch[2] ?? "";
      if (!effectKeys.has(key)) {
        warnings.push(`Unsupported effect key "${key}" will be preserved only in the raw YAML.`);
        continue;
      }
      assignEffect(draft.effects, key, rawValue, errors);
      continue;
    }

    if (!match) {
      errors.push(`Unsupported YAML line: ${trimmed}`);
      continue;
    }

    const key = match[1] as keyof ScenarioDraft | "effects";
    const rawValue = match[2] ?? "";
    inEffects = key === "effects";

    if (!topLevelKeys.has(key)) {
      warnings.push(`Unsupported top-level key "${key}" will be preserved only in the raw YAML.`);
      continue;
    }

    if (listKeys.has(key)) {
      currentList = key as "tags" | "expectedAlarms" | "reportTags";
      if (rawValue.trim() === "[]") {
        draft[currentList] = [];
      }
      continue;
    }

    assignTopLevel(draft, key, rawValue, errors);
  }

  return { draft, errors, warnings };
}

export function cloneScenarioDraft(draft: ScenarioDraft): ScenarioDraft {
  return {
    ...draft,
    tags: [...draft.tags],
    expectedAlarms: [...draft.expectedAlarms],
    reportTags: [...draft.reportTags],
    effects: { ...draft.effects },
  };
}

function assignTopLevel(
  draft: ScenarioDraft,
  key: keyof ScenarioDraft | "effects",
  rawValue: string,
  errors: string[],
) {
  if (key === "effects") {
    return;
  }

  const value = unquoteYaml(rawValue);
  if (key === "severity") {
    draft.severity = scenarioSeverityOptions.includes(value as ScenarioDraft["severity"])
      ? (value as ScenarioDraft["severity"])
      : draft.severity;
    return;
  }
  if (key === "enabled") {
    draft.enabled = value !== "false";
    return;
  }
  if (key === "version") {
    const version = Number(value);
    draft.version = Number.isFinite(version) ? version : 1;
    return;
  }
  if (key === "tags" || key === "expectedAlarms" || key === "reportTags") {
    return;
  }
  if (typeof draft[key] === "string") {
    draft[key] = value;
    return;
  }

  errors.push(`Unsupported YAML field "${key}".`);
}

function assignEffect(
  effects: ScenarioEffectsDraft,
  key: keyof ScenarioEffectsDraft,
  rawValue: string,
  errors: string[],
) {
  const value = unquoteYaml(rawValue);
  if (key === "behavior") {
    effects.behavior = scenarioBehaviorOptions.includes(value as ScenarioBehavior)
      ? (value as ScenarioBehavior)
      : effects.behavior;
    return;
  }
  if (key === "mode") {
    effects.mode = value;
    return;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    errors.push(`Effect "${key}" must be numeric.`);
    return;
  }
  effects[key] = numberValue;
}

function unquoteYaml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function encodedSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function uniqueMessages(messages: string[]): string[] {
  return [...new Set(messages)];
}
