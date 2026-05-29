import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { demoFallbackTrendSamples } from "@/entities/telemetry/model/demoFallbackTelemetry";
import type { SimulationTelemetrySnapshot } from "@/entities/simulation/model/types";
import { chartTheme } from "@/shared/config/chartTheme";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type TrendTag = "temperature" | "pressure" | "flow";

const tags: Array<{
  id: TrendTag;
  label: string;
  tag: string;
  unit: string;
  color: keyof Pick<typeof chartTheme, "temperature" | "pressure" | "flow">;
}> = [
  {
    id: "temperature",
    label: "Temperature",
    tag: "TT-101",
    unit: "C",
    color: "temperature",
  },
  {
    id: "pressure",
    label: "Pressure",
    tag: "PT-101",
    unit: "MPa",
    color: "pressure",
  },
  {
    id: "flow",
    label: "Flow",
    tag: "FT-101",
    unit: "kg/s",
    color: "flow",
  },
];

export interface ProcessTrendsPanelProps {
  history?: SimulationTelemetrySnapshot[];
  dataState?: "loading" | "connected" | "degraded";
  sourceLabel?: string;
}

export function ProcessTrendsPanel({ history, dataState = "loading", sourceLabel }: ProcessTrendsPanelProps) {
  const [activeTag, setActiveTag] = useState<TrendTag>("temperature");
  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === activeTag) ?? tags[0],
    [activeTag],
  );

  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      return demoFallbackTrendSamples;
    }
    return history.map((sample) => ({
      time: new Date(sample.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      temperature: sample.loopTemperatureC ?? sample.primaryTemperatureC,
      pressure: sample.loopPressureMPa ?? sample.primaryPressureMPa,
      flow: sample.loopFlowKgS ?? sample.coolantFlowPct,
    }));
  }, [history]);
  const usingFallback = !history || history.length === 0;

  return (
    <Card>
      <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle>Trend Workspace</CardTitle>
          <CardDescription>
            Historian-style view backed by in-memory simulation history when available.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-border/80 bg-background/40 px-3 py-1 text-xs text-muted-foreground" data-testid="historian-source-badge">
            {sourceLabel ?? (dataState === "connected" ? "Simulation history" : dataState)}
          </span>
          {usingFallback ? (
            <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs text-warning">
              Fallback demo graph
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {usingFallback ? (
          <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
            No history samples are available yet, so this chart is showing an explicitly labelled static demo curve.
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-2 rounded-full border border-border/70 bg-muted/40 p-1">
          {tags.map((tag) => (
            <Button
              key={tag.id}
              variant={tag.id === activeTag ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTag(tag.id)}
              className="flex-1 sm:flex-none"
            >
              {tag.tag} {tag.label}
            </Button>
          ))}
        </div>

        <div className="h-[380px] rounded-2xl border border-border/60 bg-surface-subtle/60 p-3" data-testid="trends-chart">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ left: 0, right: 16 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="time"
                stroke={chartTheme.axis}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                stroke={chartTheme.axis}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={{
                  background: chartTheme.tooltipBackground,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: "14px",
                  color: chartTheme.tooltipText,
                  boxShadow: "var(--shadow-panel)",
                }}
              />
              <Line
                type="monotone"
                dataKey={selectedTag.id}
                name={`${selectedTag.tag} ${selectedTag.unit}`}
                stroke={chartTheme[selectedTag.color]}
                strokeWidth={3}
                dot={{ r: 3, fill: chartTheme[selectedTag.color] }}
                activeDot={{ r: 5 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
