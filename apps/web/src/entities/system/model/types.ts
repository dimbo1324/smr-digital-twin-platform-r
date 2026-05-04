export interface ComponentStatus {
  status: string;
  latencyMs?: number;
}

export interface SystemStatus {
  platform: string;
  mode: "simulation_only" | string;
  environment: string;
  controlBoundary: "no_live_control" | string;
  dataSource: "mock" | string;
  backendApi: ComponentStatus;
  mqttBroker: ComponentStatus;
  simulationService: ComponentStatus;
  historian: ComponentStatus;
  safetyDisclaimer: string;
  version: string;
  timestamp: string;
}
