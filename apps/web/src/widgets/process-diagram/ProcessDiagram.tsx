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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
  offline: "border-zinc-500/25 bg-zinc-500/10 text-zinc-300",
  mock: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  normal: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
};

const statusBadgeVariant: Record<
  EquipmentStatus,
  "outline" | "default" | "warning" | "success"
> = {
  offline: "outline",
  mock: "default",
  warning: "warning",
  normal: "success",
};

function EquipmentNode({ node }: { node: ProcessNode }) {
  return (
    <div
      className={cn(
        "min-h-[150px] rounded-lg border p-4 transition-colors hover:bg-white/[0.06]",
        statusClasses[node.status],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-md border border-white/10 bg-black/20 p-2">
          <node.icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <Badge variant={statusBadgeVariant[node.status]}>{node.status}</Badge>
      </div>
      <p className="mt-5 font-mono text-xs text-muted-foreground">{node.tag}</p>
      <h3 className="mt-1 text-base font-semibold text-white">{node.label}</h3>
      {node.value ? <p className="mt-2 text-sm text-zinc-300">{node.value}</p> : null}
    </div>
  );
}

function ProcessPipe() {
  return (
    <div className="hidden items-center justify-center xl:flex" aria-hidden="true">
      <div className="flex h-10 w-12 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
        <ArrowRight className="h-5 w-5" />
      </div>
    </div>
  );
}

export function ProcessDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Mnemonic</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_48px_1fr_48px_1fr_48px_1fr_48px_1fr_48px_1fr]">
          {nodes.map((node, index) => (
            <div key={node.tag} className="contents">
              <EquipmentNode node={node} />
              {index < nodes.length - 1 ? <ProcessPipe /> : null}
            </div>
          ))}
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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-xs text-muted-foreground">{tag}</p>
      <p className="mt-1 text-sm text-zinc-200">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
