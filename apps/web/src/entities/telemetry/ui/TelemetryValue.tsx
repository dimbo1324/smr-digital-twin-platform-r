import type { TelemetryPoint, TelemetryStatus } from "@/entities/telemetry/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

const statusVariant: Record<
  TelemetryStatus,
  "outline" | "default" | "warning" | "success"
> = {
  offline: "outline",
  mock: "default",
  warning: "warning",
  normal: "success",
};

export interface TelemetryValueProps {
  point: TelemetryPoint;
}

export function TelemetryValue({ point }: TelemetryValueProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{point.tag}</p>
            <p className="mt-1 text-sm text-zinc-200">{point.label}</p>
          </div>
          <Badge variant={statusVariant[point.status]}>{point.quality}</Badge>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-2xl font-semibold text-zinc-50">{point.value}</span>
          {point.unit ? (
            <span className="pb-1 text-sm text-muted-foreground">{point.unit}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
