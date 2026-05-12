import type { EventRecord } from "@/entities/events/model/types";

export const mockEvents: EventRecord[] = [
  {
    id: "evt-001",
    timestamp: "09:45:00",
    severity: "INFO",
    source: "web-shell",
    type: "UI_READY",
    message: "Frontend shell loaded in mock environment.",
  },
  {
    id: "evt-002",
    timestamp: "09:44:32",
    severity: "NOTICE",
    source: "telemetry-mock",
    type: "SNAPSHOT_REFRESH",
    message: "Mock telemetry snapshot refreshed.",
  },
  {
    id: "evt-003",
    timestamp: "09:43:18",
    severity: "WARNING",
    source: "simulation",
    type: "SIMULATION_OFFLINE",
    message: "Simulation service is not connected in MVP shell.",
  },
];
