import { mockTelemetryPoints } from "@/entities/telemetry/model/mockTelemetry";
import { TelemetryValue } from "@/entities/telemetry/ui/TelemetryValue";
import { ProcessTrendsPanel } from "@/features/process-trends/ProcessTrendsPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const primaryTrendTags = ["TT-101", "PT-101", "FT-101"];

export function TrendsPage() {
  const trendPoints = mockTelemetryPoints.filter((point) =>
    primaryTrendTags.includes(point.tag),
  );

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {trendPoints.map((point) => (
          <TelemetryValue key={point.tag} point={point} />
        ))}
      </section>

      <ProcessTrendsPanel />

      <Card>
        <CardHeader>
          <CardTitle>Tag Selector</CardTitle>
          <CardDescription>
            Mock tag list for future historian API queries and downsampling controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {trendPoints.map((point) => (
              <label
                key={point.tag}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300"
              >
                <input type="checkbox" checked readOnly disabled className="h-4 w-4" />
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
    </>
  );
}
