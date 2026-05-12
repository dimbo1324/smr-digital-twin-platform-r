export type ProcessStatus =
  | "OK"
  | "WARNING"
  | "ALARM"
  | "TRIP"
  | "DEGRADED"
  | "OFFLINE"
  | "UNKNOWN";

export interface ProcessTopology {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  meta: ProcessTopologyMeta;
}

export interface ProcessNode {
  id: string;
  name: string;
  type: string;
  zone: string;
  description: string;
  status: ProcessStatus;
  health: string;
  metrics: ProcessMetric[];
  alarms: ProcessNodeAlarm[];
  position: ProcessNodePosition;
  updatedAt: string;
  simulationOnly: boolean;
}

export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  flowType: string;
  label: string;
  status: ProcessStatus;
  animated: boolean;
  metrics: ProcessMetric[];
}

export interface ProcessMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  displayValue: string;
  status: ProcessStatus;
  precision: number;
}

export interface ProcessNodeAlarm {
  id: string;
  code: string;
  severity: string;
  title: string;
  message: string;
  startedAt: string;
}

export interface ProcessNodePosition {
  x: number;
  y: number;
}

export interface ProcessTopologyMeta {
  source: string;
  simulationOnly: boolean;
  generatedAt: string;
  simulationConnected: boolean;
  simulationMode: string;
  simulationHealth: string;
}
