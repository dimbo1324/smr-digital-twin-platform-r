import type { TelemetryDisplayPoint } from "@/entities/telemetry/model/types";
import {
  findTelemetryByTag,
  formatTelemetryAge,
  formatTelemetryValue,
  getTelemetryAge,
} from "@/entities/telemetry/lib/selectors";
import { telemetrySource } from "../lib/formatters";
import { qualityBadge } from "../lib/statusLabels";
import { dashboardTelemetryTags } from "../lib/viewModel";
import { StateNotice } from "./primitives";
import type { LiveTelemetryState } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function TelemetrySummaryCard({ telemetry }: { telemetry: LiveTelemetryState }) {
  const hasTelemetry = telemetry.points.length > 0;

  return (
    <Card data-testid="dashboard-telemetry-summary">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Process Telemetry Summary</CardTitle>
          <Badge variant={telemetry.state === "connected" ? "success" : telemetry.state === "loading" ? "warning" : "offline"}>
            {telemetry.state === "connected" ? "Simulation API" : telemetry.state}
          </Badge>
        </div>
        <CardDescription>
          Live synthetic process-loop values from <span className="font-mono">/api/v1/telemetry/latest</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {telemetry.state === "loading" && !hasTelemetry ? (
          <StateNotice label="Waiting for simulation telemetry..." />
        ) : telemetry.state === "degraded" && !hasTelemetry ? (
          <StateNotice label="No telemetry data available from the API." tone="offline" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardTelemetryTags.map((item) => {
              const point = findTelemetryByTag(telemetry.points, item.tag);
              return (
                <TelemetryMetric
                  key={item.tag}
                  label={item.label}
                  tag={item.tag}
                  point={point}
                  age={formatTelemetryAge(getTelemetryAge(telemetry.points, item.tag))}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TelemetryMetric({
  label,
  tag,
  point,
  age,
}: {
  label: string;
  tag: string;
  point?: TelemetryDisplayPoint;
  age: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{tag}</p>
        </div>
        <Badge variant={qualityBadge(point?.quality)}>{point?.quality ?? "MISSING"}</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground">{formatTelemetryValue(point)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={point ? "mock" : "offline"}>{point ? telemetrySource(point) : "No data"}</Badge>
        <span>{age}</span>
      </div>
    </div>
  );
}
