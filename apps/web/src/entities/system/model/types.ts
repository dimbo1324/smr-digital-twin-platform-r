export interface ComponentStatus {
  status: string;
  latencyMs?: number;
}

export interface SystemStatus {
  platform: string;
  mode: "simulation_only" | string;
  environment: string;
  controlBoundary: "no_live_control" | string;
  dataSource: "synthetic_simulation" | "in_memory_fallback" | string;
  backendApi: ComponentStatus;
  mqttBroker: ComponentStatus;
  simulationService: ComponentStatus;
  historian: ComponentStatus;
  simulationConnected: boolean;
  simulationMode?: string;
  simulationHealth?: string;
  lastSimulationTimestamp?: string;
  safetyDisclaimer: string;
  version: string;
  timestamp: string;
}
