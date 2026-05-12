import { useState } from "react";
import { mockTelemetryPoints } from "@/entities/telemetry/model/mockTelemetry";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ProcessTrendsPanel } from "@/features/process-trends/ProcessTrendsPanel";
import { useTelemetryHistory } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

const primaryTrendTags = ["TT-101", "PT-101", "FT-101"];

export function TrendsPage() {
  const [windowValue, setWindowValue] = useState("15m");
  const { history, state } = useTelemetryHistory(windowValue);
  const trendPoints = mockTelemetryPoints.filter((point) =>
    primaryTrendTags.includes(point.tag),
  );

  return (
    <PageShell>
      <section className="grid gap-4 md:grid-cols-3">
        {trendPoints.map((point) => (
          <TelemetryValue key={point.tag} point={point} />
        ))}
      </section>

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>History Window</CardTitle>
            <CardDescription>
              Synthetic telemetry history from backend API, with static fallback if unavailable.
            </CardDescription>
          </div>
          <Badge variant={state === "connected" ? "success" : "warning"}>
            {state === "connected" ? "simulation history" : "fallback"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["5m", "15m", "30m", "1h"].map((windowOption) => (
              <Button
                key={windowOption}
                size="sm"
                variant={windowOption === windowValue ? "default" : "outline"}
                onClick={() => setWindowValue(windowOption)}
              >
                {windowOption}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ProcessTrendsPanel history={history} />

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Tag Selector</CardTitle>
            <CardDescription>
              Mock tag list for future historian API queries and downsampling controls.
            </CardDescription>
          </div>
          <Badge variant="outline">raw / 1s / 10s / 1m later</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {trendPoints.map((point) => (
              <label
                key={point.tag}
                className="flex cursor-not-allowed items-center gap-4 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4 text-sm text-foreground"
              >
                <input type="checkbox" checked readOnly disabled className="h-4 w-4 accent-primary" />
                <span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {point.tag}
                  </span>
                  <span>{point.label}</span>
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
