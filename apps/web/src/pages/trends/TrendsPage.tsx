import { useState } from "react";
import { getDemoFallbackTelemetryPoint } from "@/entities/telemetry/model/demoFallbackTelemetry";
import { useHistorianStatus } from "@/entities/historian/api/useHistorianStatus";
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
  const latestTelemetry = useLatestTelemetry(2000);
  const historian = useHistorianStatus();
  const supportedResolutions = historian.status?.supportedResolutions?.length
    ? historian.status.supportedResolutions
    : ["raw"];
  const defaultResolution = ["6h", "24h"].includes(windowValue) && supportedResolutions.includes("1m") ? "1m" : "raw";
  const [resolution, setResolution] = useState("raw");
  const effectiveResolution = supportedResolutions.includes(resolution) ? resolution : defaultResolution;
  const { history, state, source } = useTelemetryHistory(windowValue, effectiveResolution);
  const trendPoints = TREND_TELEMETRY_TAGS
    .map(({ tag }) => findTelemetryByTag(latestTelemetry.points, tag) ?? getDemoFallbackTelemetryPoint(tag))
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
          Summary cards use latest API telemetry when available. The chart uses backend
          telemetry history and clearly labels persistent, in-memory, or static fallback data.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3" data-testid="trends-telemetry-cards">
        {trendPoints.map((point) => (
          <TelemetryValue key={point.tag} point={point} />
        ))}
      </section>

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>History Window</CardTitle>
            <CardDescription>
              Synthetic telemetry history from backend API. Longer windows can use historian downsampling when available.
            </CardDescription>
          </div>
          <Badge variant={state === "connected" ? "success" : "warning"} data-testid="trends-source-badge">
            {sourceLabel(source, state, historian.status?.status)}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["5m", "15m", "30m", "1h", "6h", "24h"].map((windowOption) => (
              <Button
                key={windowOption}
                size="sm"
                variant={windowOption === windowValue ? "default" : "outline"}
                onClick={() => {
                  setWindowValue(windowOption);
                  if (["6h", "24h"].includes(windowOption) && supportedResolutions.includes("1m")) {
                    setResolution("1m");
                  }
                }}
              >
                {windowOption}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Telemetry history resolution">
            {["raw", "1m"].map((resolutionOption) => {
              const disabled = !supportedResolutions.includes(resolutionOption);
              return (
                <Button
                  key={resolutionOption}
                  size="sm"
                  variant={resolutionOption === effectiveResolution ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => setResolution(resolutionOption)}
                  data-testid={`trends-resolution-${resolutionOption}`}
                >
                  {resolutionOption === "raw" ? "Raw samples" : "1 minute aggregate"}
                </Button>
              );
            })}
            {effectiveResolution !== "raw" ? (
              <Badge variant="mock">Downsampled synthetic historian data</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ProcessTrendsPanel history={history} dataState={state} />

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Tag Selector</CardTitle>
            <CardDescription>
              Current process-loop trend tags. Resolution controls request raw or downsampled synthetic historian data.
            </CardDescription>
          </div>
          <Badge variant="outline">{effectiveResolution === "raw" ? "raw samples" : "1m aggregate"}</Badge>
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

function sourceLabel(source: string, state: string, historianStatus?: string) {
  if (source === "persistent_historian_1m") {
    return "aggregated historian";
  }
  if (source === "persistent_historian") {
    return "persistent historian";
  }
  if (historianStatus === "connected" && state === "connected") {
    return "persistent historian";
  }
  return state === "connected" ? "in-memory simulation history" : "fallback";
}
