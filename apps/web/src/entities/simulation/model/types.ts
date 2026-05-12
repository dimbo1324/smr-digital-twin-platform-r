export interface SimulationTelemetrySnapshot {
  reactorPowerPct: number;
  thermalPowerMw: number;
  electricPowerMw: number;
  primaryTemperatureC: number;
  secondaryTemperatureC: number;
  primaryPressureMPa: number;
  secondaryPressureMPa: number;
  coolantFlowPct: number;
  steamGeneratorLevelPct: number;
  turbineRpm: number;
  generatorLoadPct: number;
  condenserVacuumKPa: number;
  feedwaterFlowPct: number;
  vibrationMmS: number;
  radiationLevelUSvH: number;
  availabilityPct: number;
  efficiencyPct: number;
  loopTemperatureC: number;
  loopPressureMPa: number;
  loopFlowKgS: number;
  tankLevelPct: number;
  valvePositionPct: number;
  pumpState: string;
  heatExchangerState: string;
  pidControllerMode: string;
  timestamp: string;
  mode: string;
  health: string;
  simulationOnly: boolean;
  scenario: string;
}

export interface SimulationScenario {
  name: string;
  title: string;
  description: string;
  simulationOnly: boolean;
}

export interface SimulationAlarm {
  id: string;
  assetId: string;
  code: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "ALARM" | "CRITICAL";
  status: "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";
  value: number;
  threshold: number;
  unit: string;
  startedAt: string;
  updatedAt: string;
  clearedAt?: string;
}

export interface SimulationStatus {
  running: boolean;
  mode: string;
  health: string;
  activeScenario: string;
  tickMs: number;
  historySize: number;
  snapshotCount: number;
  lastSimulationTimestamp: string;
  simulationOnly: boolean;
}
