import type { TelemetryDisplayPoint } from "@/entities/telemetry/model/types";
import type { CommandRecord } from "@/entities/commands/model/types";

export function commandTimestamp(command: CommandRecord): string {
  return command.completedAt ?? command.acceptedAt ?? command.rejectedAt ?? command.requestedAt;
}

export function telemetrySource(point: TelemetryDisplayPoint): string {
  if (point.source === "simulation") {
    return "Simulation / Synthetic";
  }

  if (point.source?.includes("demo-fallback") || point.source?.includes("mock")) {
    return "Demo fallback";
  }

  return point.source ?? "Fallback";
}
