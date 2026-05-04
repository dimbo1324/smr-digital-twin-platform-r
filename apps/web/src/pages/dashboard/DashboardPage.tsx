import { FileText } from "lucide-react";
import { historicalAlarms } from "@/entities/alarms/model/mockAlarms";
import { mockEvents } from "@/entities/events/model/mockEvents";
import { AlarmList } from "@/widgets/alarm-list/AlarmList";
import { StatusSummary } from "@/widgets/status-summary/StatusSummary";
import { TrendPreview } from "@/widgets/trend-preview/TrendPreview";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function DashboardPage() {
  return (
    <>
      <StatusSummary />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <TrendPreview />

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>
              Current shell state before backend, MQTT, and simulator integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverviewRow label="Mode" value="Demo Environment" tone="default" />
            <OverviewRow label="Data source" value="Offline Mock Data" tone="warning" />
            <OverviewRow label="Control boundary" value="No Live Control" tone="warning" />
            <OverviewRow label="Backend API" value="Not Connected" tone="outline" />
            <OverviewRow label="MQTT broker" value="Not Connected" tone="outline" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Latest Mock Events</CardTitle>
            <CardDescription>
              Event-log shape for future platform and simulation events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {event.timestamp}
                  </span>
                  <Badge variant={event.severity === "WARNING" ? "warning" : "secondary"}>
                    {event.severity}
                  </Badge>
                  <span className="font-mono text-xs text-zinc-400">
                    {event.source}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-200">{event.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MVP Scope</CardTitle>
            <CardDescription>
              Frontend shell boundaries for the current milestone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Industrial HMI shell",
                "Static process mnemonic",
                "Mock telemetry cards",
                "Alarm lifecycle placeholders",
                "Trend chart workspace",
                "Disabled simulation settings",
              ].map((scope) => (
                <div
                  key={scope}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-200"
                >
                  <FileText className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  {scope}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <AlarmList
        title="Recent Alarm Examples"
        description="Historical mock alarms; there are no active alarms in this shell."
        alarms={historicalAlarms.slice(0, 2)}
      />
    </>
  );
}

function OverviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "warning" | "outline";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}
