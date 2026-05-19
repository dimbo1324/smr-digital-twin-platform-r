// Generated from packages/schemas/openapi.yaml.
// Do not edit manually. Run `npm run api:types` from apps/web.

export interface components {
  schemas: {
    "ApiMeta": {
      "requestId"?: string;
      "timestamp": string;
      "count"?: number;
      "source"?: string;
      "degraded"?: boolean;
    };
    "ApiError": {
      "code": string;
      "message": string;
    };
    "ErrorResponse": {
      "error": components["schemas"]["ApiError"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "HealthResponse": {
      "status": string;
      "service": string;
      "version": string;
      "environment": string;
      "uptimeSeconds": number;
      "timestamp": string;
    };
    "ComponentStatus": {
      "status": string;
      "latencyMs"?: number;
    };
    "SystemStatus": {
      "platform": string;
      "mode": string;
      "environment": string;
      "controlBoundary": string;
      "dataSource": string;
      "backendApi": components["schemas"]["ComponentStatus"];
      "mqttBroker": components["schemas"]["ComponentStatus"];
      "simulationService": components["schemas"]["ComponentStatus"];
      "historian": components["schemas"]["ComponentStatus"];
      "simulationConnected": boolean;
      "simulationMode"?: string;
      "simulationHealth"?: string;
      "lastSimulationTimestamp"?: string;
      "safetyDisclaimer": string;
      "version": string;
      "timestamp": string;
    };
    "AssetMetric": {
      "name": string;
      "value": number;
      "unit": string;
    };
    "AssetMetadata": {
      "site"?: string;
      "unit"?: string;
      [key: string]: string | undefined;
    };
    "Asset": {
      "id": string;
      "tag": string;
      "name": string;
      "type": string;
      "status": string;
      "area"?: string;
      "unit"?: string;
      "safetyClass"?: string;
      "description"?: string;
      "metadata"?: components["schemas"]["AssetMetadata"];
      "keyMetrics"?: components["schemas"]["AssetMetric"][];
      "updatedAt"?: string;
    };
    "TelemetryPoint": {
      "tag": string;
      "name": string;
      "value"?: number;
      "valueText"?: string;
      "unit": string;
      "quality": "GOOD" | "BAD" | "UNCERTAIN";
      "timestamp": string;
      "source": string;
      "area"?: string;
      "assetTag"?: string;
      "metadata"?: { [key: string]: unknown };
    };
    "TelemetrySnapshot": {
      "reactorPowerPct": number;
      "thermalPowerMw": number;
      "electricPowerMw": number;
      "primaryTemperatureC": number;
      "secondaryTemperatureC": number;
      "primaryPressureMPa": number;
      "secondaryPressureMPa": number;
      "coolantFlowPct": number;
      "steamGeneratorLevelPct": number;
      "turbineRpm": number;
      "generatorLoadPct": number;
      "condenserVacuumKPa": number;
      "feedwaterFlowPct": number;
      "vibrationMmS": number;
      "radiationLevelUSvH": number;
      "availabilityPct": number;
      "efficiencyPct": number;
      "loopTemperatureC": number;
      "loopPressureMPa": number;
      "loopFlowKgS": number;
      "tankLevelPct": number;
      "valvePositionPct": number;
      "valveState": string;
      "pumpState": string;
      "pumpRpm": number;
      "heatExchangerState": string;
      "pidControllerMode": string;
      "timestamp": string;
      "mode": string;
      "health": string;
      "simulationOnly": boolean;
      "scenario": string;
    };
    "CommandPayload": {
      "positionPercent"?: number;
      "reason"?: string;
    };
    "CommandRequest": {
      "targetTag": "V-101" | "P-101";
      "commandType": "OPEN" | "CLOSE" | "STOP" | "SET_POSITION" | "START";
      "source"?: string;
      "requestedBy"?: string;
      "payload"?: components["schemas"]["CommandPayload"];
      "correlationId"?: string;
    };
    "Command": {
      "id": string;
      "targetTag": "V-101" | "P-101";
      "commandType": "OPEN" | "CLOSE" | "STOP" | "SET_POSITION" | "START";
      "source": "frontend" | "api" | "scenario" | "system";
      "requestedBy": string;
      "payload": components["schemas"]["CommandPayload"];
      "status": "RECEIVED" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
      "requestedAt": string;
      "acceptedAt"?: string;
      "completedAt"?: string;
      "rejectedAt"?: string;
      "resultMessage"?: string;
      "errorCode"?: string;
      "errorMessage"?: string;
      "correlationId"?: string;
    };
    "AlarmInstance": {
      "id": string;
      "ruleId": string;
      "assetId": string;
      "tag": string;
      "code": string;
      "title": string;
      "message": string;
      "severity": "INFO" | "WARNING" | "HIGH" | "ALARM" | "CRITICAL";
      "status": "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";
      "value": number;
      "lastValue": number;
      "threshold": number;
      "unit": string;
      "source": string;
      "startedAt": string;
      "activeAt": string;
      "updatedAt": string;
      "acknowledgedAt"?: string;
      "acknowledgedBy"?: string;
      "clearedAt"?: string;
      "metadata"?: { [key: string]: unknown };
    };
    "AcknowledgeAlarmRequest": {
      "acknowledgedBy"?: string;
      "comment"?: string;
    };
    "Event": {
      "id": string;
      "timestamp": string;
      "type": "COMMAND_RECEIVED" | "COMMAND_ACCEPTED" | "COMMAND_REJECTED" | "COMMAND_STARTED" | "COMMAND_COMPLETED" | "COMMAND_FAILED" | "EQUIPMENT_STATE_CHANGED" | "ALARM_ACTIVATED" | "ALARM_ACKNOWLEDGED" | "ALARM_CLEARED" | "SYSTEM_STATUS_CHANGED" | "SIMULATION_STATE_UPDATED" | "SCENARIO_STARTED" | "SCENARIO_COMPLETED";
      "source": string;
      "severity": "INFO" | "WARNING" | "ERROR" | "CRITICAL";
      "targetTag"?: string;
      "commandId"?: string;
      "alarmId"?: string;
      "message": string;
      "metadata"?: { [key: string]: unknown };
    };
    "Scenario": {
      "name": string;
      "title": string;
      "description": string;
      "simulationOnly": boolean;
    };
    "SimulationStatus": {
      "running": boolean;
      "mode": string;
      "health": string;
      "activeScenario": string;
      "tickMs": number;
      "historySize": number;
      "snapshotCount": number;
      "lastSimulationTimestamp": string;
      "simulationOnly": boolean;
    };
    "SystemStatusResponse": {
      "data": components["schemas"]["SystemStatus"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "AssetsResponse": {
      "data": components["schemas"]["Asset"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "TelemetryLatestResponse": {
      "data": components["schemas"]["TelemetryPoint"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "TelemetryHistoryResponse": {
      "data": components["schemas"]["TelemetrySnapshot"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "CommandResponse": {
      "data": components["schemas"]["Command"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "CommandsResponse": {
      "data": components["schemas"]["Command"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "EventsResponse": {
      "data": components["schemas"]["Event"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "AlarmResponse": {
      "data": components["schemas"]["AlarmInstance"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "AlarmsResponse": {
      "data": components["schemas"]["AlarmInstance"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "ScenariosResponse": {
      "data": components["schemas"]["Scenario"][];
      "meta": components["schemas"]["ApiMeta"];
    };
    "SimulationStatusResponse": {
      "data": components["schemas"]["SimulationStatus"];
      "meta": components["schemas"]["ApiMeta"];
    };
  };
}

