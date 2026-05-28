const exactLabels: Record<string, string> = {
  simulation_only: "Simulation only",
  synthetic_simulation: "Synthetic simulation",
  in_memory: "In-memory",
  in_memory_fallback: "In-memory fallback",
  persistent_historian: "Persistent historian",
  rest_polling: "REST polling",
  publish_only: "Publish-only",
  demo_fallback: "Demo fallback",
  mqtt_publish_only: "MQTT publish-only",
  connected: "Connected",
  checking: "Checking",
  disabled: "Disabled",
  unavailable: "Unavailable",
  degraded: "Degraded",
  implemented: "Implemented",
  "simulation-only": "Simulation-only",
  "simulation-only report": "Simulation-only report",
  "simulation only": "Simulation only",
  "publish-only connected": "Publish-only connected",
  "in-memory fallback": "In-memory fallback",
  "persistent historian": "Persistent historian",
};

export function displayLabel(value: string) {
  const trimmed = value.trim();
  const exact = exactLabels[trimmed.toLowerCase()];

  if (exact) {
    return exact;
  }

  if (trimmed.includes("/") || trimmed.startsWith("demo-") || /-[a-z0-9]+-/i.test(trimmed)) {
    return trimmed;
  }

  if (!/[_-]/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
