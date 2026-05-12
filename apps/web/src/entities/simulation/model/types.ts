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

export type SimulationAlarm = Alarm;

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
import type { Alarm } from "@/entities/alarms/model/types";
