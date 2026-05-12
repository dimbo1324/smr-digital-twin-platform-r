import { AlertTriangle, Cpu, Zap } from "lucide-react";
import type { ProcessNode } from "@/entities/process/model/types";
import { ProcessStatusBadge } from "@/widgets/process-mnemonic/ProcessStatusBadge";
import { cn } from "@/shared/lib/cn";

const statusClass: Record<ProcessNode["status"], string> = {
  OK: "border-success/25 bg-success/10",
  WARNING: "border-warning/35 bg-warning/10",
  ALARM: "border-danger/35 bg-danger/10",
  TRIP: "border-danger/50 bg-danger/15 shadow-[0_0_38px_hsl(var(--danger)/0.18)]",
  DEGRADED: "border-offline/30 bg-offline/10",
  OFFLINE: "border-offline/30 bg-offline/10",
  UNKNOWN: "border-mock/25 bg-mock/10",
};

export function ProcessNodeCard({
  node,
  selected,
  onSelect,
}: {
  node: ProcessNode;
  selected: boolean;
  onSelect: (node: ProcessNode) => void;
}) {
  const primaryMetrics = node.metrics.slice(0, 2);
  const unacknowledged = node.alarms.filter((alarm) => alarm.status === "ACTIVE").length;
  const acknowledged = node.alarms.filter((alarm) => alarm.status === "ACKNOWLEDGED").length;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={cn(
        "absolute z-10 w-[190px] rounded-2xl border p-4 text-left shadow-panel transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-lift",
        statusClass[node.status],
        selected && "ring-2 ring-primary/60",
      )}
      style={{ left: node.position.x, top: node.position.y }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl border border-current/15 bg-background/40 p-2 text-primary">
          {node.type.includes("electrical") ? (
            <Zap className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Cpu className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <ProcessStatusBadge status={node.status} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{node.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{node.zone}</p>
      <div className="mt-3 space-y-1.5">
        {primaryMetrics.length > 0 ? (
          primaryMetrics.map((metric) => (
            <div key={metric.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{metric.label}</span>
              <span className="font-mono text-foreground">{metric.displayValue}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No live metrics</p>
        )}
      </div>
      {unacknowledged > 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {unacknowledged} unacknowledged
        </div>
      ) : null}
      {acknowledged > 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-xs text-info">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {acknowledged} acknowledged
        </div>
      ) : null}
    </button>
  );
}
