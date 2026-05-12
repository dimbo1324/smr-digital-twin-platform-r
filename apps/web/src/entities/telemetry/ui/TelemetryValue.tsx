import type { TelemetryPoint, TelemetryStatus } from "@/entities/telemetry/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

const statusVariant: Record<
  TelemetryStatus,
  "offline" | "mock" | "warning" | "success"
> = {
  offline: "offline",
  mock: "mock",
  warning: "warning",
  normal: "success",
};

export interface TelemetryValueProps {
  point: TelemetryPoint;
}

interface TelemetryScale {
  percent: number;
  label: string;
}

const telemetryRanges: Record<string, { min: number; max: number; label: string }> = {
  "%": { min: 0, max: 100, label: "0-100% engineering range" },
  C: { min: 250, max: 330, label: "250-330 C mock operating band" },
  MPa: { min: 0, max: 20, label: "0-20 MPa mock operating band" },
  "kg/s": { min: 0, max: 160, label: "0-160 kg/s mock operating band" },
  MW: { min: 0, max: 320, label: "0-320 MW synthetic band" },
  rpm: { min: 0, max: 3800, label: "0-3800 rpm synthetic band" },
  kPa: { min: 0, max: 100, label: "0-100 kPa synthetic band" },
  "mm/s": { min: 0, max: 8, label: "0-8 mm/s synthetic band" },
  "uSv/h": { min: 0, max: 2, label: "0-2 uSv/h synthetic demo band" },
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getTelemetryScale(point: TelemetryPoint): TelemetryScale | null {
  if (typeof point.value !== "number" || Number.isNaN(point.value)) {
    return null;
  }

  const range = telemetryRanges[point.unit];
  if (!range) {
    return null;
  }

  const normalized = ((point.value - range.min) / (range.max - range.min)) * 100;
  return {
    percent: clampPercent(normalized),
    label: range.label,
  };
}

export function TelemetryValue({ point }: TelemetryValueProps) {
  const telemetryScale = getTelemetryScale(point);

  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{point.tag}</p>
            <p className="mt-1 text-sm text-foreground">{point.label}</p>
          </div>
          <Badge variant={statusVariant[point.status]}>{point.quality}</Badge>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-2xl font-semibold text-foreground">{point.value}</span>
          {point.unit ? (
            <span className="pb-1 text-sm text-muted-foreground">{point.unit}</span>
          ) : null}
        </div>
        {telemetryScale ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-[0.7rem] text-muted-foreground">
              <span>{telemetryScale.label}</span>
              <span className="font-mono">{Math.round(telemetryScale.percent)}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(telemetryScale.percent)}
              aria-label={`${point.label} normalized mock telemetry value`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  point.status === "warning"
                    ? "bg-gradient-to-r from-warning/70 to-warning"
                    : "bg-gradient-to-r from-primary/60 to-mock",
                )}
                style={{ width: `${telemetryScale.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-full border border-border/70 bg-surface-subtle/70 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  point.status === "offline" ? "bg-offline" : "bg-mock",
                )}
                aria-hidden="true"
              />
              Discrete state
            </span>
            <span className="font-mono text-foreground/80">{point.quality}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
