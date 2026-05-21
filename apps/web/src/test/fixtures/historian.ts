import type { HistorianStatus } from "@/entities/historian/model/types";

export const historianPersistentFixture: HistorianStatus = {
  enabled: true,
  mode: "persistent",
  status: "connected",
  database: "postgresql/timescaledb",
  writeIntervalMs: 1000,
  telemetrySampleMs: 1000,
  lastSuccessfulWriteAt: "2026-05-21T06:00:00Z",
  fallbackActive: false,
  simulationOnly: true,
  safetyDisclaimer: "The historian stores synthetic simulation data only.",
};

export const historianFallbackFixture: HistorianStatus = {
  ...historianPersistentFixture,
  enabled: false,
  mode: "in_memory",
  status: "disabled",
  database: "in-memory",
  fallbackActive: true,
};
