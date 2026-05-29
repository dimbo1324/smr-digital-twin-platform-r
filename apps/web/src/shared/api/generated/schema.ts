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
      "requiredPermission"?: string;
      "role"?: string;
      "simulationOnly"?: boolean;
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
      "pidSetpointC": number;
      "pidProcessValueC": number;
      "pidErrorC": number;
      "pidOutputPct": number;
      "pidPTermPct": number;
      "pidITermPct": number;
      "pidDTermPct": number;
      "pidStatus": string;
      "pidSaturated": boolean;
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
      "source": "frontend" | "api" | "user" | "scenario" | "pid" | "system";
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
      "rejectReason"?: components["schemas"]["CommandRejectReason"];
      "arbitrationMode"?: components["schemas"]["ControlMode"];
      "authority"?: components["schemas"]["ControlAuthority"];
      "rejectedBy"?: string;
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
      "type": "COMMAND_RECEIVED" | "COMMAND_ACCEPTED" | "COMMAND_REJECTED" | "COMMAND_STARTED" | "COMMAND_COMPLETED" | "COMMAND_FAILED" | "EQUIPMENT_STATE_CHANGED" | "ALARM_ACTIVATED" | "ALARM_ACKNOWLEDGED" | "ALARM_CLEARED" | "SYSTEM_STATUS_CHANGED" | "SIMULATION_STATE_UPDATED" | "SCENARIO_STARTED" | "SCENARIO_COMPLETED" | "CONTROL_MODE_CHANGED" | "CONTROL_AUTHORITY_CHANGED" | "COMMAND_REJECTED_BY_ARBITRATION" | "PID_ENABLED" | "PID_DISABLED" | "PID_SETPOINT_CHANGED" | "PID_TUNING_CHANGED" | "PID_OUTPUT_UPDATED" | "PID_OUTPUT_SATURATED" | "PID_OUTPUT_RELEASED" | "PID_STATUS_CHANGED";
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
    "ControlMode": "MANUAL" | "AUTO" | "DISABLED";
    "ControlAuthority": "USER" | "SCENARIO" | "PID" | "SYSTEM" | "NONE";
    "CommandRejectReason": "CONTROL_MODE_AUTO" | "CONTROL_DISABLED" | "UNSUPPORTED_COMMAND_SOURCE" | "UNSUPPORTED_TARGET" | "INVALID_COMMAND" | "INVALID_PAYLOAD" | "TARGET_CONTROLLED_BY_PID" | "UNKNOWN";
    "ControlStatus": {
      "controllerTag": string;
      "controlledVariableTag": string;
      "manipulatedVariableTag": string;
      "mode": components["schemas"]["ControlMode"];
      "authority": components["schemas"]["ControlAuthority"];
      "enabled": boolean;
      "pidImplemented": boolean;
      "reason": string;
      "updatedAt": string;
      "updatedBy": string;
      "safetyDisclaimer": string;
    };
    "ModeChangeRequest": {
      "mode": components["schemas"]["ControlMode"];
      "requestedBy"?: string;
      "reason"?: string;
    };
    "ArbitrationDecision": {
      "allowed": boolean;
      "reason"?: components["schemas"]["CommandRejectReason"];
      "message"?: string;
      "mode": components["schemas"]["ControlMode"];
      "authority": components["schemas"]["ControlAuthority"];
      "targetTag": string;
      "commandType": string;
      "source": string;
    };
    "ControlStatusResponse": {
      "data": components["schemas"]["ControlStatus"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "PIDStatus": {
      "controllerTag": string;
      "mode": components["schemas"]["ControlMode"];
      "authority": components["schemas"]["ControlAuthority"];
      "active": boolean;
      "pidImplemented": boolean;
      "processVariableTag": string;
      "processValue": number;
      "setpoint": number;
      "manipulatedVariableTag": string;
      "output": number;
      "outputMin": number;
      "outputMax": number;
      "kp": number;
      "ki": number;
      "kd": number;
      "error": number;
      "pTerm": number;
      "iTerm": number;
      "dTerm": number;
      "integral": number;
      "derivative": number;
      "saturated": boolean;
      "status": string;
      "updatedAt": string;
      "safetyDisclaimer": string;
    };
    "PIDConfigUpdateRequest": {
      "setpoint"?: number;
      "kp"?: number;
      "ki"?: number;
      "kd"?: number;
      "outputMin"?: number;
      "outputMax"?: number;
      "requestedBy"?: string;
      "reason"?: string;
    };
    "PIDStatusResponse": {
      "data": components["schemas"]["PIDStatus"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "HistorianStatus": {
      "enabled": boolean;
      "mode": "in_memory" | "persistent";
      "status": "disabled" | "connected" | "degraded" | "unavailable_fallback";
      "database": string;
      "writeIntervalMs": number;
      "telemetrySampleMs": number;
      "lastSuccessfulWriteAt"?: string;
      "lastErrorAt"?: string;
      "lastErrorMessage"?: string;
      "fallbackActive": boolean;
      "retentionEnabled": boolean;
      "rawRetention"?: string;
      "downsamplingEnabled": boolean;
      "supportedResolutions"?: ("raw" | "1m")[];
      "aggregateStatus"?: string;
      "simulationOnly": boolean;
      "safetyDisclaimer": string;
    };
    "HistorianStatusResponse": {
      "data": components["schemas"]["HistorianStatus"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "MQTTStatus": {
      "enabled": boolean;
      "connected": boolean;
      "status": "disabled" | "connected" | "degraded" | "unavailable";
      "brokerUrl": string;
      "clientId": string;
      "topicPrefix": string;
      "qos": number;
      "retain": boolean;
      "publishIntervalMs": number;
      "lastConnectedAt"?: string;
      "lastDisconnectedAt"?: string;
      "lastSuccessfulPublishAt"?: string;
      "lastErrorAt"?: string;
      "lastErrorMessage"?: string;
      "messagesPublished": number;
      "messagesFailed": number;
      "simulationOnly": boolean;
      "safetyDisclaimer": string;
    };
    "MQTTStatusResponse": {
      "data": components["schemas"]["MQTTStatus"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "ReportUser": {
      "userId": string;
      "displayName": string;
      "role": string;
      "source": string;
    };
    "ReportDataSources": {
      "latestTelemetry": string;
      "history": string;
      "commands": string;
      "events": string;
      "alarms": string;
      "degraded": boolean;
    };
    "ReportSystemSummary": {
      "mode": string;
      "health": string;
      "activeScenario": string;
      "running": boolean;
    };
    "ReportTelemetryStats": {
      "tag": string;
      "label": string;
      "unit": string;
      "min": number;
      "max": number;
      "avg": number;
      "count": number;
      "source": string;
    };
    "ReportCountSummary": {
      "total": number;
      "byType"?: { [key: string]: number };
    };
    "ReportAlarmSummary": {
      "active": number;
      "acknowledged": number;
      "cleared": number;
      "bySeverity"?: { [key: string]: number };
    };
    "SimulationReport": {
      "reportId": string;
      "generatedAt": string;
      "timeWindow": string;
      "simulationOnly": boolean;
      "disclaimer": string;
      "generatedBy": components["schemas"]["ReportUser"];
      "dataSources": components["schemas"]["ReportDataSources"];
      "system": components["schemas"]["ReportSystemSummary"];
      "historian": components["schemas"]["HistorianStatus"];
      "mqtt": components["schemas"]["MQTTStatus"];
      "control": components["schemas"]["ControlStatus"];
      "pid": components["schemas"]["PIDStatus"];
      "latestTelemetry": components["schemas"]["TelemetrySnapshot"];
      "telemetryStats": components["schemas"]["ReportTelemetryStats"][];
      "commands": components["schemas"]["ReportCountSummary"];
      "events": components["schemas"]["ReportCountSummary"];
      "alarms": components["schemas"]["ReportAlarmSummary"];
    };
    "SimulationReportResponse": {
      "data": components["schemas"]["SimulationReport"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "Role": "VIEWER" | "ENGINEER" | "OPERATOR" | "SUPERVISOR" | "ADMIN";
    "Permission": "VIEW_DASHBOARD" | "VIEW_PROCESS" | "VIEW_ALARMS" | "VIEW_EVENTS" | "VIEW_TRENDS" | "VIEW_SETTINGS" | "SEND_COMMAND" | "CHANGE_CONTROL_MODE" | "UPDATE_PID_CONFIG" | "ACKNOWLEDGE_ALARM" | "RUN_SCENARIO" | "VIEW_DIAGNOSTICS" | "VIEW_MQTT_STATUS" | "VIEW_HISTORIAN_STATUS" | "ADMIN_DEMO_SESSION";
    "DemoUser": {
      "id": string;
      "displayName": string;
      "role": components["schemas"]["Role"];
      "permissions": components["schemas"]["Permission"][];
      "badgeLabel": string;
      "description": string;
    };
    "AuthSession": {
      "userId": string;
      "displayName": string;
      "role": components["schemas"]["Role"];
      "permissions": components["schemas"]["Permission"][];
      "source": string;
      "simulationOnly": boolean;
      "disclaimer": string;
    };
    "AuthSessionResponse": {
      "data": components["schemas"]["AuthSession"];
      "meta": components["schemas"]["ApiMeta"];
    };
    "DemoUsersResponse": {
      "data": components["schemas"]["DemoUser"][];
      "meta": components["schemas"]["ApiMeta"];
    };
  };
}

