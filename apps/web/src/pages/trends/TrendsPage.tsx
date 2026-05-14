import { useState } from "react";
import { getMockTelemetryPoint } from "@/entities/telemetry/model/mockTelemetry";
import { findTelemetryByTag } from "@/entities/telemetry/lib/selectors";
import { TREND_TELEMETRY_TAGS } from "@/entities/telemetry/model/processTags";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ProcessTrendsPanel } from "@/features/process-trends/ProcessTrendsPanel";
import { useLatestTelemetry, useTelemetryHistory } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

export function TrendsPage() {
  const [windowValue, setWindowValue] = useState("15m");
  const { history, state } = useTelemetryHistory(windowValue);
  const latestTelemetry = useLatestTelemetry(2000);
  const trendPoints = TREND_TELEMETRY_TAGS
    .map(({ tag }) => findTelemetryByTag(latestTelemetry.points, tag) ?? getMockTelemetryPoint(tag))
    .filter((point) => point !== undefined);
  const summaryState = latestTelemetry.state === "connected" ? "Live telemetry summary" : "Fallback telemetry summary";

  return (
    <PageShell data-testid="trends-page">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-panel">
        <Badge variant={latestTelemetry.state === "connected" ? "success" : "warning"}>
          {summaryState}
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
          Trends workspace for synthetic process telemetry.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Summary cards use latest API telemetry when available. The chart uses in-memory
          simulation history and clearly labels static fallback curves.
        </p>
      </section>

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
              Synthetic telemetry history from backend API. Static fallback is labelled on the chart when history is unavailable.
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

      <ProcessTrendsPanel history={history} dataState={state} />

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Tag Selector</CardTitle>
            <CardDescription>
              Current process-loop trend tags. Multi-tag queries and downsampling controls are planned.
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
