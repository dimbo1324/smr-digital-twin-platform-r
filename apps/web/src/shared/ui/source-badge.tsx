import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { displayLabel } from "@/shared/lib/display-labels";

function sourceTone(source?: string): StatusTone {
  const normalized = source?.toLowerCase() ?? "";

  if (
    normalized.includes("persistent") ||
    normalized.includes("backend") ||
    normalized.includes("simulation api")
  ) {
    return "connected";
  }

  if (normalized.includes("fallback") || normalized.includes("in-memory")) {
    return "fallback";
  }

  if (
    normalized.includes("mqtt") ||
    normalized.includes("synthetic") ||
    normalized.includes("simulation")
  ) {
    return "simulation";
  }

  if (normalized.includes("unavailable") || normalized.includes("offline")) {
    return "disabled";
  }

  return "neutral";
}

export function SourceBadge({ source, className }: { source?: string; className?: string }) {
  return (
    <StatusBadge
      tone={sourceTone(source)}
      value={displayLabel(source ?? "Unknown source")}
      className={className}
    />
  );
}
