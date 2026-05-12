import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ProcessNode } from "@/entities/process/model/types";
import { ProcessLegend } from "@/widgets/process-mnemonic/ProcessLegend";
import { ProcessMnemonic } from "@/widgets/process-mnemonic/ProcessMnemonic";
import { ProcessNodeDetailsPanel } from "@/widgets/process-mnemonic/ProcessNodeDetailsPanel";
import { ProcessSimulationBanner } from "@/widgets/process-mnemonic/ProcessSimulationBanner";
import { useProcessTopology } from "@/shared/api/useProcessTopology";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

export function ProcessPage() {
  const { topology, state } = useProcessTopology();
  const [searchParams] = useSearchParams();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    searchParams.get("node") ?? undefined,
  );
  const selectedNode = useMemo(
    () =>
      topology.nodes.find((node) => node.id === selectedNodeId) ??
      topology.nodes[0],
    [selectedNodeId, topology.nodes],
  );

  return (
    <PageShell>
      <ProcessSimulationBanner meta={topology.meta} />

      {state === "degraded" ? (
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader>
            <CardTitle>Degraded Process Topology</CardTitle>
            <CardDescription>
              The backend or simulation service is unavailable. The process view remains
              safe and visible, but live metrics may be missing.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card>
          <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Process Mnemonic</CardTitle>
              <CardDescription>
                Live process topology mapped in the backend from synthetic telemetry and alarms.
              </CardDescription>
            </div>
            <ProcessLegend />
          </CardHeader>
          <CardContent>
            {topology.nodes.length > 0 ? (
              <ProcessMnemonic
                topology={topology}
                selectedNodeId={selectedNode?.id}
                onSelectNode={(node: ProcessNode) => setSelectedNodeId(node.id)}
              />
            ) : (
              <div className="rounded-3xl border border-border/70 bg-surface-subtle/70 p-10 text-center text-sm text-muted-foreground">
                Process topology is not available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <ProcessNodeDetailsPanel node={selectedNode} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Topology Contract</CardTitle>
          <CardDescription>
            Frontend receives node positions, metrics, alarms, status, and edge flow
            definitions from `GET /api/v1/process/topology`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProcessFact label="Nodes" value={String(topology.nodes.length)} />
            <ProcessFact label="Edges" value={String(topology.edges.length)} />
            <ProcessFact label="Source" value={topology.meta.source} />
            <ProcessFact
              label="Simulation"
              value={topology.meta.simulationConnected ? "Connected" : "Degraded"}
            />
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function ProcessFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/70 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
