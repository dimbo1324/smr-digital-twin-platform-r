import type { EventRecord } from "@/entities/events/model/types";

export const syntheticEventsFixture: EventRecord[] = [
  {
    id: "event-1",
    timestamp: "2026-05-21T06:02:00Z",
    type: "COMMAND_COMPLETED",
    severity: "INFO",
    source: "simulation",
    targetTag: "V-101",
    message: "Simulation-only valve command completed",
    metadata: {},
  },
  {
    id: "event-2",
    timestamp: "2026-05-21T06:03:00Z",
    type: "ALARM_ACTIVATED",
    severity: "WARNING",
    source: "alarm-engine",
    targetTag: "TT-101",
    message: "Synthetic temperature alarm activated",
    metadata: {},
  },
];
