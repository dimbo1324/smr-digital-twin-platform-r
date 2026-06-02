import alarmSchema from "../../../../../../packages/schemas/schemas/alarm.schema.json";
import authSessionSchema from "../../../../../../packages/schemas/schemas/auth-session.schema.json";
import assetSchema from "../../../../../../packages/schemas/schemas/asset.schema.json";
import commandSchema from "../../../../../../packages/schemas/schemas/command.schema.json";
import commandRequestSchema from "../../../../../../packages/schemas/schemas/command-request.schema.json";
import demoUserSchema from "../../../../../../packages/schemas/schemas/demo-user.schema.json";
import controlStatusSchema from "../../../../../../packages/schemas/schemas/control-status.schema.json";
import acknowledgeAlarmRequestSchema from "../../../../../../packages/schemas/schemas/acknowledge-alarm-request.schema.json";
import eventSchema from "../../../../../../packages/schemas/schemas/event.schema.json";
import historianStatusSchema from "../../../../../../packages/schemas/schemas/historian-status.schema.json";
import mqttStatusSchema from "../../../../../../packages/schemas/schemas/mqtt-status.schema.json";
import scenarioSchema from "../../../../../../packages/schemas/schemas/scenario.schema.json";
import scenarioValidationRequestSchema from "../../../../../../packages/schemas/schemas/scenario-validation-request.schema.json";
import scenarioValidationResultSchema from "../../../../../../packages/schemas/schemas/scenario-validation-result.schema.json";
import reportSummarySchema from "../../../../../../packages/schemas/schemas/report-summary.schema.json";
import simulationStatusSchema from "../../../../../../packages/schemas/schemas/simulation-status.schema.json";
import systemStatusSchema from "../../../../../../packages/schemas/schemas/system-status.schema.json";
import telemetrySchema from "../../../../../../packages/schemas/schemas/telemetry.schema.json";
import telemetrySnapshotSchema from "../../../../../../packages/schemas/schemas/telemetry-snapshot.schema.json";
import modeChangeRequestSchema from "../../../../../../packages/schemas/schemas/mode-change-request.schema.json";
import pidConfigUpdateRequestSchema from "../../../../../../packages/schemas/schemas/pid-config-update-request.schema.json";
import pidStatusSchema from "../../../../../../packages/schemas/schemas/pid-status.schema.json";

export const apiSchemaNames = [
  "AcknowledgeAlarmRequest",
  "AlarmInstance",
  "AlarmInstanceList",
  "AuthSession",
  "Asset",
  "AssetList",
  "Command",
  "CommandList",
  "CommandRequest",
  "ControlStatus",
  "DemoUser",
  "DemoUserList",
  "Event",
  "EventList",
  "HistorianStatus",
  "MQTTStatus",
  "Scenario",
  "ScenarioList",
  "ScenarioValidationRequest",
  "ScenarioValidationResult",
  "SimulationReport",
  "SimulationStatus",
  "SystemStatus",
  "TelemetryPoint",
  "TelemetryPointList",
  "TelemetrySnapshotList",
  "ModeChangeRequest",
  "PIDConfigUpdateRequest",
  "PIDStatus",
] as const;

export type ApiSchemaName = (typeof apiSchemaNames)[number];

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
  AuthSession: authSessionSchema,
  Asset: assetSchema,
  AssetList: arrayOf("AssetList", assetSchema),
  Command: commandSchema,
  CommandList: arrayOf("CommandList", commandSchema),
  CommandRequest: commandRequestSchema,
  ControlStatus: controlStatusSchema,
  DemoUser: demoUserSchema,
  DemoUserList: arrayOf("DemoUserList", demoUserSchema),
  Event: eventSchema,
  EventList: arrayOf("EventList", eventSchema),
  HistorianStatus: historianStatusSchema,
  MQTTStatus: mqttStatusSchema,
  Scenario: scenarioSchema,
  ScenarioList: arrayOf("ScenarioList", scenarioSchema),
  ScenarioValidationRequest: scenarioValidationRequestSchema,
  ScenarioValidationResult: scenarioValidationResultSchema,
  SimulationReport: reportSummarySchema,
  SimulationStatus: simulationStatusSchema,
  SystemStatus: systemStatusSchema,
  TelemetryPoint: telemetrySchema,
  TelemetryPointList: arrayOf("TelemetryPointList", telemetrySchema),
  TelemetrySnapshotList: arrayOf("TelemetrySnapshotList", telemetrySnapshotSchema),
  ModeChangeRequest: modeChangeRequestSchema,
  PIDConfigUpdateRequest: pidConfigUpdateRequestSchema,
  PIDStatus: pidStatusSchema,
};
