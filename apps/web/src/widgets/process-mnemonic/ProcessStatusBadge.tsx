import type { ProcessStatus } from "@/entities/process/model/types";
import { Badge } from "@/shared/ui/badge";

const statusVariant: Record<
  ProcessStatus,
  "success" | "warning" | "destructive" | "offline" | "mock"
> = {
  OK: "success",
  WARNING: "warning",
  ALARM: "destructive",
  TRIP: "destructive",
  DEGRADED: "offline",
  OFFLINE: "offline",
  UNKNOWN: "mock",
};

export function ProcessStatusBadge({ status }: { status: ProcessStatus }) {
  return <Badge variant={statusVariant[status] ?? "mock"}>{status}</Badge>;
}
