import type { ProcessMetric } from "@/entities/process/model/types";
import { ProcessStatusBadge } from "@/widgets/process-mnemonic/ProcessStatusBadge";

export function ProcessMetricBadge({ metric }: { metric: ProcessMetric }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">{metric.label}</p>
        <ProcessStatusBadge status={metric.status} />
      </div>
      <p className="mt-2 font-mono text-sm font-semibold text-foreground">
        {metric.displayValue}
      </p>
    </div>
  );
}
