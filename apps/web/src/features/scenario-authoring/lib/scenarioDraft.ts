export const scenarioSeverityOptions = ["info", "warning", "critical"] as const;
export const scenarioBehaviorOptions = [
  "nominal",
  "startup_ramp",
  "load_sine",
  "sensor_drift",
  "fixed",
] as const;

export type ScenarioSeverity = (typeof scenarioSeverityOptions)[number];
export type ScenarioBehavior = (typeof scenarioBehaviorOptions)[number];

export interface ScenarioDraft {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: ScenarioSeverity;
  duration: string;
  enabled: boolean;
  version: number;
  tags: string[];
  expectedAlarms: string[];
  reportTags: string[];
  safetyNote: string;
  effects: ScenarioEffectsDraft;
}

export interface ScenarioEffectsDraft {
  behavior: ScenarioBehavior;
  mode: string;
  targetPowerPct?: number;
  amplitudePct?: number;
  periodTicks?: number;
  primaryTemperatureC?: number;
  primaryTemperatureBaseC?: number;
  primaryTemperatureDriftPerTickC?: number;
  primaryTemperatureMaxDriftC?: number;
  primaryPressureMPa?: number;
  flowPct?: number;
  levelPct?: number;
}

export interface ScenarioTemplate {
  id: string;
  label: string;
  description: string;
  draft: ScenarioDraft;
}

export interface ScenarioValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: "normal",
    label: "Normal operation",
    description: "Baseline synthetic operation with nominal process targets.",
    draft: createDraft({
      id: "custom_normal_demo",
      name: "Custom Normal Demo",
      description: "Synthetic nominal operation draft for demo validation.",
      category: "baseline",
      severity: "info",
      duration: "5m",
      tags: ["demo", "baseline"],
      reportTags: ["TT-101", "PT-101"],
      effects: { behavior: "nominal", mode: "NORMAL", targetPowerPct: 72 },
    }),
  },
  {
    id: "high_temperature",
    label: "High temperature",
    description: "Raises synthetic loop temperature to exercise alarm lifecycle.",
    draft: createDraft({
      id: "custom_high_temperature",
      name: "Custom High Temperature",
      description: "Synthetic loop temperature excursion for alarm and report demo.",
      category: "thermal",
      severity: "warning",
      duration: "5m",
      tags: ["demo", "alarm", "thermal"],
      expectedAlarms: ["HIGH_TEMPERATURE"],
      reportTags: ["TT-101", "TIC-101.ERROR"],
      effects: {
        behavior: "nominal",
        mode: "WARNING",
        targetPowerPct: 76,
        primaryTemperatureC: 322,
      },
    }),
  },
  {
    id: "pressure_deviation",
    label: "Pressure deviation",
    description: "Creates a synthetic primary pressure deviation.",
    draft: createDraft({
      id: "custom_pressure_deviation",
      name: "Custom Pressure Deviation",
      description: "Synthetic pressure deviation draft for historian and alarm review.",
      category: "pressure",
      severity: "warning",
      duration: "6m",
      tags: ["demo", "pressure"],
      expectedAlarms: ["PRESSURE_DEVIATION"],
      reportTags: ["PT-101"],
      effects: {
        behavior: "fixed",
        mode: "WARNING",
        targetPowerPct: 70,
        primaryPressureMPa: 16.4,
      },
    }),
  },
  {
    id: "pump_degradation",
    label: "Pump degradation",
    description: "Models synthetic flow reduction and vibration increase.",
    draft: createDraft({
      id: "custom_pump_degradation",
      name: "Custom Pump Degradation",
      description: "Synthetic pump degradation draft for command/event discussion.",
      category: "mechanical",
      severity: "warning",
      duration: "8m",
      tags: ["demo", "pump", "mechanical"],
      expectedAlarms: ["LOW_FLOW"],
      reportTags: ["FT-101", "P-101"],
      effects: {
        behavior: "fixed",
        mode: "WARNING",
        targetPowerPct: 68,
        flowPct: 58,
      },
    }),
  },
  {
    id: "sensor_drift",
    label: "Sensor drift",
    description: "Shows gradual synthetic temperature drift over time.",
    draft: createDraft({
      id: "custom_sensor_drift",
      name: "Custom Sensor Drift",
      description: "Synthetic sensor drift draft for trend-analysis demonstration.",
      category: "instrumentation",
      severity: "info",
      duration: "10m",
      tags: ["demo", "instrumentation", "trend"],
      reportTags: ["TT-101"],
      effects: {
        behavior: "sensor_drift",
        mode: "NORMAL",
        targetPowerPct: 72,
        primaryTemperatureBaseC: 286,
        primaryTemperatureDriftPerTickC: 0.12,
        primaryTemperatureMaxDriftC: 12,
      },
    }),
  },
  {
    id: "load_ramp",
    label: "Load ramp",
    description: "Drafts a synthetic load-changing operating window.",
    draft: createDraft({
      id: "custom_load_ramp",
      name: "Custom Load Ramp",
      description: "Synthetic load ramp draft for trends and report review.",
      category: "load",
      severity: "info",
      duration: "7m",
      tags: ["demo", "load", "trend"],
      reportTags: ["POWER", "FT-101"],
      effects: {
        behavior: "load_sine",
        mode: "NORMAL",
        targetPowerPct: 74,
        amplitudePct: 12,
        periodTicks: 25,
      },
    }),
  },
  {
    id: "trip",
    label: "Trip",
    description: "Creates a conservative synthetic trip-state draft.",
    draft: createDraft({
      id: "custom_trip_demo",
      name: "Custom Trip Demo",
      description: "Synthetic trip-state draft for event/alarm walkthroughs.",
      category: "protection",
      severity: "critical",
      duration: "3m",
      tags: ["demo", "trip", "alarm"],
      expectedAlarms: ["TRIP_ACTIVE"],
      reportTags: ["MODE", "ALARMS"],
      effects: { behavior: "fixed", mode: "TRIP", targetPowerPct: 8, flowPct: 35, levelPct: 52 },
    }),
  },
  {
    id: "blank",
    label: "Blank scenario",
    description: "Minimal safe draft for starting from scratch.",
    draft: createDraft({
      id: "custom_synthetic_scenario",
      name: "Custom Synthetic Scenario",
      description: "Simulation-only synthetic scenario draft.",
      category: "demo",
      severity: "info",
      duration: "5m",
      tags: ["demo"],
      reportTags: ["TT-101"],
      effects: { behavior: "nominal", mode: "NORMAL", targetPowerPct: 72 },
    }),
  },
];

export function createDraft(overrides: Partial<ScenarioDraft>): ScenarioDraft {
  const { effects, ...rest } = overrides;

  return {
    id: "custom_synthetic_scenario",
    name: "Custom Synthetic Scenario",
    description: "Simulation-only synthetic scenario draft.",
    category: "demo",
    severity: "info",
    duration: "5m",
    enabled: true,
    version: 1,
    tags: ["demo"],
    expectedAlarms: [],
    reportTags: ["TT-101"],
    safetyNote:
      "Simulation-only synthetic scenario draft. Not for real plant control, PLC/SCADA connectivity, production audit, or regulatory reporting.",
    ...rest,
    effects: { behavior: "nominal", mode: "NORMAL", targetPowerPct: 72, ...effects },
  };
}

export function validateScenarioDraft(
  draft: ScenarioDraft,
  existingScenarioIds: string[] = [],
): ScenarioValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!draft.id.trim()) {
    errors.push("Scenario id is required.");
  } else if (!/^[a-z][a-z0-9_]*$/.test(draft.id.trim())) {
    errors.push("Scenario id must use lowercase letters, numbers, and underscores.");
  }

  if (!draft.name.trim()) {
    errors.push("Scenario name is required.");
  }
  if (!draft.description.trim()) {
    errors.push("Description is required so reviewers understand the synthetic demo purpose.");
  }
  if (!draft.category.trim()) {
    errors.push("Category is required.");
  }
  if (!scenarioSeverityOptions.includes(draft.severity)) {
    errors.push("Severity must be info, warning, or critical.");
  }
  if (!isDuration(draft.duration)) {
    errors.push("Duration must look like 30s, 5m, or 1h.");
  }
  if (!scenarioBehaviorOptions.includes(draft.effects.behavior)) {
    errors.push("Effects behavior is not supported by the simulation YAML registry.");
  }
  if (!draft.safetyNote.toLowerCase().includes("simulation-only")) {
    errors.push("Safety note must explicitly say simulation-only.");
  }
  if (draft.version < 1 || !Number.isInteger(draft.version)) {
    errors.push("Version must be a positive integer.");
  }

  const normalizedExisting = new Set(existingScenarioIds.map((id) => id.trim()));
  if (normalizedExisting.has(draft.id.trim())) {
    warnings.push(
      "This id already exists in the embedded scenario registry. Exporting it would require a developer to rename or intentionally replace the source-controlled YAML.",
    );
  }
  if (!draft.expectedAlarms.length) {
    warnings.push(
      "No expected alarms are listed. That is fine for nominal demos, but note it in review.",
    );
  }
  if (!draft.reportTags.length) {
    warnings.push(
      "No report tags are listed, so exported YAML will be less useful in report demos.",
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function scenarioDraftToYaml(draft: ScenarioDraft): string {
  const lines: string[] = [
    `id: ${draft.id.trim()}`,
    `name: ${quoteYaml(draft.name)}`,
    `description: ${quoteYaml(draft.description)}`,
    `category: ${draft.category.trim()}`,
    `severity: ${draft.severity}`,
    `duration: ${draft.duration.trim()}`,
    "tags:",
    ...listLines(draft.tags),
    "expectedAlarms:",
    ...listLines(draft.expectedAlarms),
    "reportTags:",
    ...listLines(draft.reportTags),
    `safetyNote: ${quoteYaml(draft.safetyNote)}`,
    `enabled: ${draft.enabled ? "true" : "false"}`,
    `version: ${draft.version}`,
    "effects:",
    `  behavior: ${draft.effects.behavior}`,
    `  mode: ${draft.effects.mode.trim() || "NORMAL"}`,
  ];

  for (const [key, value] of Object.entries(draft.effects)) {
    if (key === "behavior" || key === "mode" || value === undefined || value === "") {
      continue;
    }
    lines.push(`  ${key}: ${value}`);
  }

  return `${lines.join("\n")}\n`;
}

export function parseListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listInputValue(values: string[]): string {
  return values.join(", ");
}

export function scenarioYamlFilename(id: string): string {
  const safeId = id
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeId || "simulation-scenario-draft"}.yaml`;
}

function isDuration(value: string): boolean {
  return /^\d+(ms|s|m|h)$/.test(value.trim());
}

function listLines(values: string[]): string[] {
  if (!values.length) {
    return ["  []"];
  }
  return values.map((value) => `  - ${quoteYaml(value)}`);
}

function quoteYaml(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_./:-]+(?: [A-Za-z0-9_./:-]+)*$/.test(trimmed)) {
    return trimmed;
  }
  return JSON.stringify(trimmed);
}
