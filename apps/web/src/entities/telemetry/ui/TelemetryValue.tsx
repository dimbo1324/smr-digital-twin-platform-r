import type { TelemetryPoint, TelemetryStatus } from "@/entities/telemetry/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

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

export function TelemetryValue({ point }: TelemetryValueProps) {
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
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary/50 transition-all duration-500 group-hover:w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}
