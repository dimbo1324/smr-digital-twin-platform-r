export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
    users: ["auth", "users"] as const,
  },
  system: {
    status: ["system", "status"] as const,
  },
  assets: {
    all: ["assets"] as const,
  },
  telemetry: {
    latest: ["telemetry", "latest"] as const,
    history: (windowValue: string, resolution = "raw") =>
      ["telemetry", "history", windowValue, resolution] as const,
    histories: ["telemetry", "history"] as const,
  },
  control: {
    status: ["control", "status"] as const,
  },
  pid: {
    status: ["pid", "status"] as const,
  },
  historian: {
    status: ["historian", "status"] as const,
  },
  mqtt: {
    status: ["mqtt", "status"] as const,
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
  reports: {
    simulationSummary: (windowValue: string, options?: unknown) =>
      ["reports", "simulation-summary", windowValue, options] as const,
  },
};
