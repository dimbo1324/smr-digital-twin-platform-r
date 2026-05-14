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
import type { TelemetryDisplayPoint, TelemetryStatus } from "@/entities/telemetry/model/types";
import {
  findTelemetryByTag,
  formatTelemetryValue,
  telemetrySourceLabel,
} from "@/entities/telemetry/lib/selectors";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

type SourceVariant = "success" | "mock" | "warning" | "offline";
type DataState = "loading" | "connected" | "degraded";

interface ProcessNode {
  tag: string;
  label: string;
  status: TelemetryStatus;
  value: string;
  icon: LucideIcon;
  source: string;
  sourceVariant: SourceVariant;
}

export interface ProcessDiagramProps {
  telemetryPoints: TelemetryDisplayPoint[];
  dataState: DataState;
}

const statusClasses: Record<TelemetryStatus, string> = {
  offline: "border-offline/25 bg-offline/10 text-offline",
  mock: "border-mock/25 bg-mock/10 text-mock",
  warning: "border-warning/30 bg-warning/10 text-warning",
  normal: "border-success/25 bg-success/10 text-success",
};

const statusBadgeVariant: Record<
  TelemetryStatus,
  "offline" | "mock" | "warning" | "success"
> = {
  offline: "offline",
  mock: "mock",
  warning: "warning",
  normal: "success",
};

function pointStatus(point: TelemetryDisplayPoint | undefined, fallback: TelemetryStatus): TelemetryStatus {
  return point?.status ?? fallback;
}

function pointSourceVariant(point: TelemetryDisplayPoint | undefined): SourceVariant {
  if (!point) {
    return "offline";
  }

  if (point.source === "simulation") {
    return "success";
  }

  return point.source?.includes("mock") ? "mock" : "warning";
}

function buildNodes(telemetryPoints: TelemetryDisplayPoint[]): ProcessNode[] {
  const tankLevel = findTelemetryByTag(telemetryPoints, "LT-101");
  const pumpState = findTelemetryByTag(telemetryPoints, "P-101.STATE");
  const pumpRpm = findTelemetryByTag(telemetryPoints, "P-101.RPM");
  const valvePosition = findTelemetryByTag(telemetryPoints, "V-101.POS");
  const valveState = findTelemetryByTag(telemetryPoints, "V-101.STATE");
  const heatExchangerState = findTelemetryByTag(telemetryPoints, "HX-101.STATE");
  const temperature = findTelemetryByTag(telemetryPoints, "TT-101");
  const pressure = findTelemetryByTag(telemetryPoints, "PT-101");
  const flow = findTelemetryByTag(telemetryPoints, "FT-101");
  const controllerMode = findTelemetryByTag(telemetryPoints, "TIC-101.MODE");

  return [
    {
      tag: "T-101",
      label: "Tank",
      status: pointStatus(tankLevel, "offline"),
      value: `Level ${formatTelemetryValue(tankLevel)}`,
      icon: Box,
      source: telemetrySourceLabel(tankLevel),
      sourceVariant: pointSourceVariant(tankLevel),
    },
    {
      tag: "P-101",
      label: "Pump",
      status: pointStatus(pumpState, "offline"),
      value: `${formatTelemetryValue(pumpState)} / ${formatTelemetryValue(pumpRpm)}`,
      icon: Gauge,
      source: telemetrySourceLabel(pumpState),
      sourceVariant: pointSourceVariant(pumpState),
    },
    {
      tag: "V-101",
      label: "Valve",
      status: pointStatus(valvePosition, "warning"),
      value: `${formatTelemetryValue(valvePosition)} / ${formatTelemetryValue(valveState)}`,
      icon: SlidersHorizontal,
      source: telemetrySourceLabel(valvePosition),
      sourceVariant: pointSourceVariant(valvePosition),
    },
    {
      tag: "HX-101",
      label: "Heat Exchanger",
      status: pointStatus(heatExchangerState, "warning"),
      value: formatTelemetryValue(heatExchangerState),
      icon: Factory,
      source: telemetrySourceLabel(heatExchangerState),
      sourceVariant: pointSourceVariant(heatExchangerState),
    },
    {
      tag: "Sensors",
      label: "TT / PT / FT",
      status: pointStatus(temperature ?? pressure ?? flow, "offline"),
      value: `${formatTelemetryValue(temperature)} / ${formatTelemetryValue(pressure)} / ${formatTelemetryValue(flow)}`,
      icon: Thermometer,
      source: telemetrySourceLabel(temperature ?? pressure ?? flow),
      sourceVariant: pointSourceVariant(temperature ?? pressure ?? flow),
    },
    {
      tag: "TIC-101",
      label: "PID Controller",
      status: pointStatus(controllerMode, "warning"),
      value: formatTelemetryValue(controllerMode),
      icon: Cpu,
      source: telemetrySourceLabel(controllerMode),
      sourceVariant: pointSourceVariant(controllerMode),
    },
  ];
}

function EquipmentNode({ node }: { node: ProcessNode }) {
  return (
    <div
      className={cn(
        "group min-h-[168px] rounded-2xl border p-4 transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-panel",
        statusClasses[node.status],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-current/20 bg-background/40 p-2.5">
          <node.icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={statusBadgeVariant[node.status]}>{node.status}</Badge>
          <Badge variant={node.sourceVariant}>{node.source}</Badge>
        </div>
      </div>
      <p className="mt-5 font-mono text-xs text-muted-foreground">{node.tag}</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">{node.label}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{node.value}</p>
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

export function ProcessDiagram({ telemetryPoints, dataState }: ProcessDiagramProps) {
  const nodes = buildNodes(telemetryPoints);
  const sourceLabel =
    dataState === "connected"
      ? "Live API telemetry"
      : dataState === "loading"
        ? "Loading telemetry"
        : "Fallback telemetry";

  return (
    <Card className="overflow-hidden" data-testid="process-diagram">
      <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle>Process Mnemonic</CardTitle>
          <CardDescription>
            HMI-like process view bound to backend telemetry when available.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={dataState === "connected" ? "success" : "warning"}>{sourceLabel}</Badge>
          <Badge variant="mock">{"Tank -> Pump -> Valve -> HX -> Sensors -> PID"}</Badge>
        </div>
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
          <SensorBadge telemetryPoints={telemetryPoints} tag="TT-101" label="Temperature" />
          <SensorBadge telemetryPoints={telemetryPoints} tag="PT-101" label="Pressure" />
          <SensorBadge telemetryPoints={telemetryPoints} tag="FT-101" label="Flow" testId="flow-value" />
        </div>
      </CardContent>
    </Card>
  );
}

function SensorBadge({
  telemetryPoints,
  tag,
  label,
  testId,
}: {
  telemetryPoints: TelemetryDisplayPoint[];
  tag: string;
  label: string;
  testId?: string;
}) {
  const point = findTelemetryByTag(telemetryPoints, tag);
  const status = pointStatus(point, "offline");

  return (
    <div
      className="rounded-2xl border border-border/70 bg-surface-elevated/70 p-4 transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-elevated/90 hover:shadow-panel"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{tag}</p>
          <p className="mt-1 text-sm text-foreground">{label}</p>
        </div>
        <span
          className={cn(
            "status-dot",
            status === "normal" ? "bg-success animate-soft-pulse" : null,
            status === "warning" || status === "mock" ? "bg-warning" : null,
            status === "offline" ? "bg-offline" : null,
          )}
        />
      </div>
      <p className="mt-3 text-xl font-semibold text-foreground">{formatTelemetryValue(point)}</p>
      <Badge variant={pointSourceVariant(point)} className="mt-3">
        {telemetrySourceLabel(point)}
      </Badge>
    </div>
  );
}
