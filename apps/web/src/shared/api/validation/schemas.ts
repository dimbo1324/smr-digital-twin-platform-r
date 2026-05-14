import alarmSchema from "../../../../../../packages/schemas/schemas/alarm.schema.json";
import assetSchema from "../../../../../../packages/schemas/schemas/asset.schema.json";
import commandSchema from "../../../../../../packages/schemas/schemas/command.schema.json";
import commandRequestSchema from "../../../../../../packages/schemas/schemas/command-request.schema.json";
import acknowledgeAlarmRequestSchema from "../../../../../../packages/schemas/schemas/acknowledge-alarm-request.schema.json";
import eventSchema from "../../../../../../packages/schemas/schemas/event.schema.json";
import scenarioSchema from "../../../../../../packages/schemas/schemas/scenario.schema.json";
import systemStatusSchema from "../../../../../../packages/schemas/schemas/system-status.schema.json";
import telemetrySchema from "../../../../../../packages/schemas/schemas/telemetry.schema.json";

export const apiSchemaNames = [
  "AcknowledgeAlarmRequest",
  "AlarmInstance",
  "AlarmInstanceList",
  "Asset",
  "AssetList",
  "Command",
  "CommandList",
  "CommandRequest",
  "Event",
  "EventList",
  "Scenario",
  "ScenarioList",
  "SimulationStatus",
  "SystemStatus",
  "TelemetryPoint",
  "TelemetryPointList",
  "TelemetrySnapshotList",
] as const;

export type ApiSchemaName = (typeof apiSchemaNames)[number];

const telemetrySnapshotSchema = {
  title: "TelemetrySnapshot",
  type: "object",
  properties: {
    reactorPowerPct: { type: "number" },
    thermalPowerMw: { type: "number" },
    electricPowerMw: { type: "number" },
    primaryTemperatureC: { type: "number" },
    primaryPressureMPa: { type: "number" },
    coolantFlowPct: { type: "number" },
    loopTemperatureC: { type: "number" },
    loopPressureMPa: { type: "number" },
    loopFlowKgS: { type: "number" },
    tankLevelPct: { type: "number" },
    valvePositionPct: { type: "number" },
    valveState: { type: "string" },
    pumpState: { type: "string" },
    pumpRpm: { type: "number" },
    heatExchangerState: { type: "string" },
    pidControllerMode: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    mode: { type: "string" },
    health: { type: "string" },
    simulationOnly: { type: "boolean" },
    scenario: { type: "string" },
  },
  required: ["timestamp", "mode", "health", "simulationOnly"],
  additionalProperties: true,
} as const;

const simulationStatusSchema = {
  title: "SimulationStatus",
  type: "object",
  properties: {
    running: { type: "boolean" },
    mode: { type: "string" },
    health: { type: "string" },
    activeScenario: { type: "string" },
    tickMs: { type: "number" },
    historySize: { type: "number" },
    snapshotCount: { type: "number" },
    lastSimulationTimestamp: { type: "string" },
    simulationOnly: { type: "boolean" },
  },
  required: ["running", "mode", "health", "activeScenario", "tickMs", "historySize", "simulationOnly"],
  additionalProperties: true,
} as const;

function arrayOf(title: string, items: unknown) {
  return {
    title,
    type: "array",
    items,
  };
}

export const apiSchemas: Record<ApiSchemaName, unknown> = {
  AcknowledgeAlarmRequest: acknowledgeAlarmRequestSchema,
  AlarmInstance: alarmSchema,
  AlarmInstanceList: arrayOf("AlarmInstanceList", alarmSchema),
  Asset: assetSchema,
  AssetList: arrayOf("AssetList", assetSchema),
  Command: commandSchema,
  CommandList: arrayOf("CommandList", commandSchema),
  CommandRequest: commandRequestSchema,
  Event: eventSchema,
  EventList: arrayOf("EventList", eventSchema),
  Scenario: scenarioSchema,
  ScenarioList: arrayOf("ScenarioList", scenarioSchema),
  SimulationStatus: simulationStatusSchema,
  SystemStatus: systemStatusSchema,
  TelemetryPoint: telemetrySchema,
  TelemetryPointList: arrayOf("TelemetryPointList", telemetrySchema),
  TelemetrySnapshotList: arrayOf("TelemetrySnapshotList", telemetrySnapshotSchema),
};
