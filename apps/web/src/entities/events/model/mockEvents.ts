import type { EventRecord } from "@/entities/events/model/types";

export const mockEvents: EventRecord[] = [
  {
    id: "evt-001",
    timestamp: "09:45:00",
    severity: "INFO",
    source: "web-shell",
    type: "SYSTEM_STATUS_CHANGED",
    message: "Frontend shell loaded in mock environment.",
  },
  {
    id: "evt-002",
    timestamp: "09:44:32",
    severity: "INFO",
    source: "telemetry-mock",
    type: "SIMULATION_STATE_UPDATED",
    message: "Mock telemetry snapshot refreshed.",
  },
  {
    id: "evt-003",
    timestamp: "09:43:18",
    severity: "WARNING",
    source: "simulation",
    type: "SYSTEM_STATUS_CHANGED",
    message: "Simulation service is not connected in MVP shell.",
  },
];
