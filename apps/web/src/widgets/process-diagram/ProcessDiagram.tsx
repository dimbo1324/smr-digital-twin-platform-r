import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Box,
  Cpu,
  Factory,
  Gauge,
  SlidersHorizontal,
  Thermometer,
} from "lucide-react";
import type { EquipmentStatus } from "@/entities/equipment/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

interface ProcessNode {
  tag: string;
  label: string;
  status: EquipmentStatus;
  value?: string;
  icon: LucideIcon;
}

const nodes: ProcessNode[] = [
  {
    tag: "T-101",
    label: "Tank",
    status: "mock",
    value: "Level 72%",
    icon: Box,
  },
  {
    tag: "P-101",
    label: "Pump",
    status: "offline",
    value: "Offline",
    icon: Gauge,
  },
  {
    tag: "V-101",
    label: "Valve",
    status: "warning",
    value: "64% open",
    icon: SlidersHorizontal,
  },
  {
    tag: "HX-101",
    label: "Heat Exchanger",
    status: "mock",
    value: "Mock duty",
    icon: Factory,
  },
  {
    tag: "Sensors",
    label: "TT / PT / FT",
    status: "normal",
    value: "Good quality",
    icon: Thermometer,
  },
  {
    tag: "TIC-101",
    label: "PID Controller",
    status: "normal",
    value: "Auto disabled",
    icon: Cpu,
  },
];

const statusClasses: Record<EquipmentStatus, string> = {
  offline: "border-offline/25 bg-offline/10 text-offline",
  mock: "border-mock/25 bg-mock/10 text-mock",
  warning: "border-warning/30 bg-warning/10 text-warning",
  normal: "border-success/25 bg-success/10 text-success",
};

const statusBadgeVariant: Record<
  EquipmentStatus,
  "offline" | "mock" | "warning" | "success"
> = {
  offline: "offline",
  mock: "mock",
  warning: "warning",
  normal: "success",
};

function EquipmentNode({ node }: { node: ProcessNode }) {
  return (
    <div
      className={cn(
        "group min-h-[156px] rounded-2xl border p-4 transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lift",
        statusClasses[node.status],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-current/20 bg-background/40 p-2.5">
          <node.icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <Badge variant={statusBadgeVariant[node.status]}>{node.status}</Badge>
      </div>
      <p className="mt-5 font-mono text-xs text-muted-foreground">{node.tag}</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">{node.label}</h3>
      {node.value ? <p className="mt-2 text-sm text-muted-foreground">{node.value}</p> : null}
    </div>
  );
}

function ProcessPipe() {
  return (
    <div className="hidden items-center justify-center xl:flex" aria-hidden="true">
      <div className="relative h-px w-full overflow-hidden rounded-full bg-border">
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-primary/70 animate-[flow_1.8s_linear_infinite]" />
      </div>
      <div className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
}

export function ProcessDiagram() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle>Process Mnemonic</CardTitle>
          <CardDescription>
            Static HMI-like process view prepared for real-time telemetry binding.
          </CardDescription>
        </div>
        <Badge variant="mock">{"Tank -> Pump -> Valve -> HX -> Sensors -> PID"}</Badge>
      </CardHeader>
      <CardContent>
        <div className="rounded-3xl border border-border/70 bg-surface-subtle/60 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_48px_1fr_48px_1fr_48px_1fr_48px_1fr_48px_1fr]">
            {nodes.map((node, index) => (
              <div key={node.tag} className="contents">
                <EquipmentNode node={node} />
                {index < nodes.length - 1 ? <ProcessPipe /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SensorBadge tag="TT-101" label="Temperature" value="286.4 C" />
          <SensorBadge tag="PT-101" label="Pressure" value="15.1 MPa" />
          <SensorBadge tag="FT-101" label="Flow" value="118 kg/s" />
        </div>
      </CardContent>
    </Card>
  );
}

function SensorBadge({
  tag,
  label,
  value,
}: {
  tag: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{tag}</p>
          <p className="mt-1 text-sm text-foreground">{label}</p>
        </div>
        <span className="status-dot bg-success animate-soft-pulse" />
      </div>
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
