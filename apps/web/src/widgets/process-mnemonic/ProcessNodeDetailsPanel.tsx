import { Clock3, ShieldCheck } from "lucide-react";
import type { ProcessNode } from "@/entities/process/model/types";
import { ProcessMetricBadge } from "@/widgets/process-mnemonic/ProcessMetricBadge";
import { ProcessStatusBadge } from "@/widgets/process-mnemonic/ProcessStatusBadge";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function ProcessNodeDetailsPanel({ node }: { node?: ProcessNode }) {
  if (!node) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node Details</CardTitle>
          <CardDescription>Select a process node to inspect synthetic state.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-border/70 bg-surface-subtle/70 p-8 text-center text-sm text-muted-foreground">
            No node selected.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{node.name}</CardTitle>
            <CardDescription>{node.description}</CardDescription>
          </div>
          <ProcessStatusBadge status={node.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Type" value={node.type} />
          <Detail label="Zone" value={node.zone} />
          <Detail label="Health" value={node.health} />
          <Detail label="Updated" value={new Date(node.updatedAt).toLocaleTimeString()} />
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Metrics</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {node.metrics.length > 0 ? (
              node.metrics.map((metric) => (
                <ProcessMetricBadge key={metric.key} metric={metric} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No live metrics.</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Active Alarms</p>
          {node.alarms.length > 0 ? (
            <div className="space-y-2">
              {node.alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="rounded-2xl border border-warning/30 bg-warning/10 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={alarm.severity === "CRITICAL" ? "destructive" : "warning"}>
                      {alarm.severity}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {alarm.code}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{alarm.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{alarm.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-3 text-sm text-muted-foreground">
              No active alarms.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="info">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Simulation only
          </Badge>
          <Badge variant="outline">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            No real plant control
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
