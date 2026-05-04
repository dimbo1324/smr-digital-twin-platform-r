import { mockTelemetryPoints } from "@/entities/telemetry/model/mockTelemetry";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ProcessTrendsPanel } from "@/features/process-trends/ProcessTrendsPanel";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

const primaryTrendTags = ["TT-101", "PT-101", "FT-101"];

export function TrendsPage() {
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

      <ProcessTrendsPanel />

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
