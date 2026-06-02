import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const openApiPath = resolve(import.meta.dirname, "../../../packages/schemas/openapi.yaml");
const schemasSourcePath = resolve(import.meta.dirname, "../src/shared/api/validation/schemas.ts");
const openApi = JSON.parse(await readFile(openApiPath, "utf8"));
const schemasSource = await readFile(schemasSourcePath, "utf8");

const requiredPaths = [
  "/health",
  "/metrics",
  "/api/v1/system/status",
  "/api/v1/assets",
  "/api/v1/telemetry/latest",
  "/api/v1/telemetry/history",
  "/api/v1/commands",
  "/api/v1/commands/recent",
  "/api/v1/events/recent",
  "/api/v1/alarms/active",
  "/api/v1/alarms/history",
  "/api/v1/alarms/{alarmID}/acknowledge",
  "/api/v1/control/status",
  "/api/v1/control/mode",
  "/api/v1/pid/status",
  "/api/v1/pid/config",
  "/api/v1/historian/status",
  "/api/v1/mqtt/status",
  "/api/v1/auth/session",
  "/api/v1/auth/users",
  "/api/v1/simulation/scenarios",
  "/api/v1/scenarios/validate",
  "/api/v1/simulation/scenarios/{scenarioName}/start",
  "/api/v1/simulation/scenarios/stop",
  "/api/v1/simulation/reset",
  "/api/v1/reports/simulation-summary",
];

const requiredRuntimeSchemas = [
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
];

const missingPaths = requiredPaths.filter((path) => !openApi.paths?.[path]);
const missingRuntimeSchemas = requiredRuntimeSchemas.filter(
  (name) => !schemasSource.includes(`"${name}"`),
);

if (missingPaths.length > 0 || missingRuntimeSchemas.length > 0) {
  if (missingPaths.length > 0) {
    console.error("OpenAPI is missing required paths:");
    for (const path of missingPaths) {
      console.error(`- ${path}`);
    }
  }
  if (missingRuntimeSchemas.length > 0) {
    console.error("Runtime validation mapping is missing required schemas:");
    for (const name of missingRuntimeSchemas) {
      console.error(`- ${name}`);
    }
  }
  process.exit(1);
}

console.log(
  `Contract coverage ok: ${requiredPaths.length} paths, ${requiredRuntimeSchemas.length} runtime schemas.`,
);
