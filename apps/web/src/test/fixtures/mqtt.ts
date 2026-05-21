import type { MQTTStatus } from "@/entities/mqtt/model/types";

export const mqttConnectedFixture: MQTTStatus = {
  enabled: true,
  connected: true,
  status: "connected",
  brokerUrl: "tcp://mqtt:1883",
  clientId: "smr-simulation-publisher",
  topicPrefix: "smr/site-001/unit-001",
  qos: 0,
  retain: false,
  publishIntervalMs: 1000,
  lastConnectedAt: "2026-05-21T06:00:00Z",
  lastSuccessfulPublishAt: "2026-05-21T06:00:10Z",
  messagesPublished: 42,
  messagesFailed: 0,
  simulationOnly: true,
  safetyDisclaimer: "MQTT topics contain synthetic simulation payloads only.",
};

export const mqttDegradedFixture: MQTTStatus = {
  ...mqttConnectedFixture,
  connected: false,
  status: "degraded",
  lastErrorAt: "2026-05-21T06:01:00Z",
  lastErrorMessage: "broker unavailable",
  messagesFailed: 2,
};
