import type { ProcessTopologyMeta } from "@/entities/process/model/types";
import { Badge } from "@/shared/ui/badge";

export function ProcessSimulationBanner({ meta }: { meta: ProcessTopologyMeta }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/80 p-5 shadow-panel lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Badge variant={meta.simulationConnected ? "success" : "warning"}>
          {meta.simulationConnected ? "Live process topology" : "Degraded topology"}
        </Badge>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">
          Process domain topology
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Backend-mapped process structure with synthetic telemetry, node-level alarms,
          flow direction, and simulation-only status semantics.
        </p>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[420px]">
        <Fact label="Mode" value={meta.simulationMode || "UNKNOWN"} />
        <Fact label="Health" value={meta.simulationHealth || "UNKNOWN"} />
        <Fact
          label="Last updated"
          value={
            meta.generatedAt
              ? new Date(meta.generatedAt).toLocaleTimeString()
              : "not available"
          }
        />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
