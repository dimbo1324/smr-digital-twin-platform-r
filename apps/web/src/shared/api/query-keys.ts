export const queryKeys = {
  system: {
    status: ["system", "status"] as const,
  },
  assets: {
    all: ["assets"] as const,
  },
  telemetry: {
    latest: ["telemetry", "latest"] as const,
    history: (windowValue: string) => ["telemetry", "history", windowValue] as const,
    histories: ["telemetry", "history"] as const,
  },
  commands: {
    recent: ["commands", "recent"] as const,
  },
  events: {
    recent: ["events", "recent"] as const,
  },
  alarms: {
    active: ["alarms", "active"] as const,
    history: ["alarms", "history"] as const,
  },
  scenarios: {
    all: ["scenarios"] as const,
    status: ["scenarios", "status"] as const,
  },
};
