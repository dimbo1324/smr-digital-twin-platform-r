import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  Box,
  Cpu,
  Factory,
  Gauge,
  SlidersHorizontal,
  Thermometer,
} from "lucide-react";
import type { EquipmentStatus } from "@/entities/equipment/model/types";
import {
  formatTelemetryValue,
  getMockTelemetryPoint,
} from "@/entities/telemetry/model/mockTelemetry";
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
    value: `Level ${formatTelemetryValue(getMockTelemetryPoint("LT-101"))}`,
    icon: Box,
  },
  {
    tag: "P-101",
    label: "Pump",
    status: "offline",
    value: formatTelemetryValue(getMockTelemetryPoint("P-101.STATE")),
    icon: Gauge,
  },
  {
    tag: "V-101",
    label: "Valve",
    status: "warning",
    value: `${formatTelemetryValue(getMockTelemetryPoint("V-101.POS"))} open`,
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
        "group min-h-[156px] rounded-2xl border p-4 transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-panel",
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
    <div className="flex items-center justify-center px-1" aria-hidden="true">
      <div className="flex w-full min-w-12 items-center">
        <div className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-primary/60" />
        <div className="relative -ml-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-card text-primary shadow-[0_10px_26px_hsl(var(--primary)/0.16)]">
          <div className="absolute h-5 w-5 rounded-full bg-primary/10" />
          <ArrowRight className="relative h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function CompactProcessPipe() {
  return (
    <div className="flex items-center gap-3 px-5 py-1 text-primary/80" aria-hidden="true">
      <div className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-primary/25 to-primary/40" />
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/25 bg-card text-primary shadow-[0_10px_24px_hsl(var(--primary)/0.14)]">
        <ArrowDown className="h-4 w-4" />
      </div>
      <div className="h-px flex-1 rounded-full bg-gradient-to-r from-primary/40 via-primary/25 to-transparent" />
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
          <div className="grid gap-3 xl:hidden">
            {nodes.map((node, index) => (
              <div key={node.tag} className="grid gap-3">
                <EquipmentNode node={node} />
                {index < nodes.length - 1 ? <CompactProcessPipe /> : null}
              </div>
            ))}
          </div>

          <div className="hidden gap-3 xl:grid xl:grid-cols-[1fr_48px_1fr_48px_1fr_48px_1fr_48px_1fr_48px_1fr]">
            {nodes.map((node, index) => (
              <div key={node.tag} className="contents">
                <EquipmentNode node={node} />
                {index < nodes.length - 1 ? <ProcessPipe /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SensorBadge
            tag="TT-101"
            label="Temperature"
            value={formatTelemetryValue(getMockTelemetryPoint("TT-101"))}
          />
          <SensorBadge
            tag="PT-101"
            label="Pressure"
            value={formatTelemetryValue(getMockTelemetryPoint("PT-101"))}
          />
          <SensorBadge
            tag="FT-101"
            label="Flow"
            value={formatTelemetryValue(getMockTelemetryPoint("FT-101"))}
          />
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
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-4 transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-elevated/90 hover:shadow-panel">
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
