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
import { StatusBadge } from "@/shared/ui/status-badge";

type HistoryResolutionMode = "auto" | "raw" | "1m";

const historyWindows = ["15m", "1h", "6h", "24h"];
const resolutionModes: Array<{ value: HistoryResolutionMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "raw", label: "Raw samples" },
  { value: "1m", label: "1m aggregate" },
];

export function TrendsPage() {
  const [windowValue, setWindowValue] = useState("15m");
  const [resolutionMode, setResolutionMode] = useState<HistoryResolutionMode>("auto");
  const latestTelemetry = useLatestTelemetry(2000);
  const historian = useHistorianStatus();
  const supportedResolutions = historian.status?.supportedResolutions?.length
    ? historian.status.supportedResolutions
    : ["raw"];
  const defaultResolution = ["6h", "24h"].includes(windowValue) && supportedResolutions.includes("1m") ? "1m" : "raw";
  const selectedResolution = resolutionMode === "auto" ? defaultResolution : resolutionMode;
  const effectiveResolution = supportedResolutions.includes(selectedResolution) ? selectedResolution : "raw";
  const historyQuery = useTelemetryHistory(windowValue, effectiveResolution);
  const { history, state, source } = historyQuery;
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
            {historyWindows.map((windowOption) => (
              <Button
                key={windowOption}
                size="sm"
                variant={windowOption === windowValue ? "default" : "outline"}
                onClick={() => setWindowValue(windowOption)}
                data-testid={`trends-window-${windowOption}`}
              >
                {windowOption}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Telemetry history resolution">
            {resolutionModes.map((option) => {
              const disabled = option.value !== "auto" && !supportedResolutions.includes(option.value);
              const active = option.value === resolutionMode;
              return (
                <Button
                  key={option.value}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => setResolutionMode(option.value)}
                  data-testid={`trends-resolution-${option.value}`}
                >
                  {option.label}
                </Button>
              );
            })}
            {effectiveResolution !== "raw" ? (
              <Badge variant="mock">Downsampled synthetic historian data</Badge>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4" data-testid="trends-query-status">
            <QueryStatus label="Window" value={windowValue} />
            <QueryStatus label="Resolution" value={resolutionLabel(resolutionMode, effectiveResolution)} />
            <QueryStatus label="Samples" value={String(historyQuery.sampleCount)} mask />
            <QueryStatus label="Source" value={sourceLabel(source, state, historian.status?.status)} />
            <QueryStatus label="Updated" value={historyQuery.updatedAt ? new Date(historyQuery.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "pending"} mask />
            <QueryStatus label="Retention" value={historian.status?.rawRetention ?? "demo window"} />
            <QueryStatus label="Downsampling" value={historian.status?.aggregateStatus ?? (supportedResolutions.includes("1m") ? "available" : "unavailable")} />
            <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Query state</p>
              <StatusBadge className="mt-2" tone={state === "connected" ? "connected" : state === "loading" ? "degraded" : "fallback"} value={historyQuery.isRefreshing ? "refreshing" : state}>
                {historyQuery.isRefreshing ? "refreshing" : state}
              </StatusBadge>
            </div>
          </div>
          {state === "degraded" ? (
            <p className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning" role="status">
              Historian data is degraded or unavailable. The chart remains simulation-only and may show in-memory or explicit demo fallback data.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ProcessTrendsPanel history={history} dataState={state} sourceLabel={sourceLabel(source, state, historian.status?.status)} />

      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Tag Selector</CardTitle>
            <CardDescription>
              Current process-loop trend tags. Resolution controls request raw or downsampled synthetic historian data.
            </CardDescription>
          </div>
          <Badge variant="outline">{resolutionLabel(resolutionMode, effectiveResolution)}</Badge>
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

function QueryStatus({ label, value, mask = false }: { label: string; value: string; mask?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground" data-visual-mask={mask || undefined}>
        {value}
      </p>
    </div>
  );
}

function resolutionLabel(mode: HistoryResolutionMode, effectiveResolution: string) {
  if (mode === "auto") {
    return effectiveResolution === "1m" ? "Auto (1m aggregate)" : "Auto (raw)";
  }
  return effectiveResolution === "1m" ? "1m aggregate" : "Raw samples";
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
