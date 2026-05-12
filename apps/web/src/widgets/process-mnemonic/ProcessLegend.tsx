import type { ProcessStatus } from "@/entities/process/model/types";
import { ProcessStatusBadge } from "@/widgets/process-mnemonic/ProcessStatusBadge";
import { Badge } from "@/shared/ui/badge";

const statuses: ProcessStatus[] = ["OK", "WARNING", "ALARM", "TRIP", "DEGRADED", "UNKNOWN"];

export function ProcessLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-surface-elevated/70 p-3">
      {statuses.map((status) => (
        <ProcessStatusBadge key={status} status={status} />
      ))}
      <Badge variant="info">Simulation Only</Badge>
    </div>
  );
}
