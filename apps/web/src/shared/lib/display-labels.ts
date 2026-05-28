const knownLabels: Record<string, string> = {
  simulation_only: "Simulation only",
  synthetic_simulation: "Synthetic simulation",
  in_memory: "In-memory",
  in_memory_fallback: "In-memory fallback",
  persistent_historian: "Persistent historian",
  persistent_connected_with_data: "Persistent historian",
  persistent_connected_empty: "Persistent historian empty",
  persistent_read_failed_fallback: "Historian fallback",
  historian_disabled: "Historian disabled",
  historian_unavailable: "Historian unavailable",
  rest_polling: "REST polling",
  publish_only: "Publish-only",
  unavailable_fallback: "Unavailable fallback",
};

export function displayLabel(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  const normalized = value.trim();
  const known = knownLabels[normalized.toLowerCase()];
  if (known) {
    return known;
  }

  if (!/_/.test(normalized) && /\s/.test(normalized)) {
    return normalized;
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
