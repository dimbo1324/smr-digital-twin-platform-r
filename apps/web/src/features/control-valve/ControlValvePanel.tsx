import { Clock3, LockKeyhole, Power, SlidersHorizontal } from "lucide-react";
import type { TelemetryPoint } from "@/entities/telemetry/model/types";
import {
  findTelemetryByTag,
  formatTelemetryAge,
  formatTelemetryValue,
  getNumericTelemetryValue,
  getTelemetryAge,
  telemetrySourceLabel,
} from "@/entities/telemetry/lib/selectors";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type DataState = "loading" | "connected" | "degraded";

export interface ControlValvePanelProps {
  telemetryPoints: TelemetryPoint[];
  dataState: DataState;
}

function clampValvePosition(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ControlValvePanel({ telemetryPoints, dataState }: ControlValvePanelProps) {
  const valvePoint = findTelemetryByTag(telemetryPoints, "V-101.POS");
  const rawPosition = getNumericTelemetryValue(telemetryPoints, "V-101.POS", 0) ?? 0;
  const valvePosition = clampValvePosition(rawPosition);
  const valvePositionLabel = `${Math.round(valvePosition * 10) / 10}%`;
  const sourceLabel = telemetrySourceLabel(valvePoint);
  const ageLabel = formatTelemetryAge(getTelemetryAge(telemetryPoints, "V-101.POS"));
  const sourceVariant = valvePoint?.source === "simulation" ? "success" : dataState === "degraded" ? "warning" : "mock";

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Control Valve V-101</CardTitle>
            <CardDescription>
              Live position display with commands disabled until the command API exists.
            </CardDescription>
          </div>
          <Badge variant="warning">manual locked</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/10 to-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current position</p>
              <p className="mt-1 text-4xl font-semibold text-foreground">
                {valvePositionLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-foreground shadow-[0_14px_34px_hsl(var(--foreground)/0.08)]">
              <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Valve opening</span>
              <span className="font-mono font-medium text-foreground">
                {formatTelemetryValue(valvePoint)}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full border border-border/70 bg-background/70 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-mock to-warning shadow-[0_0_18px_hsl(var(--primary)/0.24)]"
                style={{ width: `${valvePosition}%` }}
              />
              <div
                className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-foreground/70"
                style={{ left: `${valvePosition}%` }}
              />
              <div className="absolute inset-y-0 left-1/4 w-px bg-border/70" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-border/70" />
              <div className="absolute inset-y-0 left-3/4 w-px bg-border/70" />
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <StatusItem label="Quality" value={valvePoint?.quality ?? "MISSING"} />
            <StatusItem label="Source" value={sourceLabel} variant={sourceVariant} />
            <StatusItem label="Updated" value={ageLabel} />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/70 bg-background/50 p-3 text-xs text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Command API is not implemented yet. Simulation-only control will be added in the next milestone.
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" disabled title="Command API is not implemented yet.">
            <Power className="h-4 w-4" aria-hidden="true" />
            Open
          </Button>
          <Button variant="outline" disabled title="Command API is not implemented yet.">
            Stop
          </Button>
          <Button variant="outline" disabled title="Command API is not implemented yet.">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({
  label,
  value,
  variant = "outline",
}: {
  label: string;
  value: string;
  variant?: "outline" | "success" | "warning" | "mock";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Clock3 className="h-3 w-3" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <Badge variant={variant} className="mt-2">
        {value}
      </Badge>
    </div>
  );
}
