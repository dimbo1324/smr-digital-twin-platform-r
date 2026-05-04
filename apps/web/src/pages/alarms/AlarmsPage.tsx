import { BellRing, CheckCircle2 } from "lucide-react";
import { activeAlarms, historicalAlarms } from "@/entities/alarms/model/mockAlarms";
import { AlarmList } from "@/widgets/alarm-list/AlarmList";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";

const lifecycleStates = [
  {
    state: "ACTIVE",
    description: "Rule condition is present and visible to the operator.",
    variant: "warning",
  },
  {
    state: "ACKNOWLEDGED",
    description: "Operator has seen the alarm; condition may still exist.",
    variant: "mock",
  },
  {
    state: "CLEARED",
    description: "Process returned to acceptable mock limits.",
    variant: "success",
  },
] as const;

export function AlarmsPage() {
  return (
    <PageShell>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Active Alarm Panel</CardTitle>
                <CardDescription>
                  Alarm lifecycle shell for future rule evaluation and acknowledgement.
                </CardDescription>
              </div>
              <Badge variant="success">0 active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activeAlarms.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-success/20 bg-gradient-to-br from-success/10 via-card to-card p-8 text-center">
                <div className="rounded-full border border-success/25 bg-success/10 p-4 text-success shadow-[0_0_40px_hsl(var(--success)/0.18)]">
                  <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  No active alarms
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  The MVP shell is running on mock data only. Alarm rules, shelving,
                  acknowledgement, and live lifecycle transitions will be connected in
                  a later step.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle States</CardTitle>
            <CardDescription>Supported alarm states for the domain model.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lifecycleStates.map((item) => (
              <div
                key={item.state}
                className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
                    {item.state}
                  </span>
                  <Badge variant={item.variant}>mock</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <AlarmList
        title="Historical Alarm Examples"
        description="Mock alarm records with id, tag, severity, status, timestamps, and acknowledgement fields."
        alarms={historicalAlarms}
      />
    </PageShell>
  );
}
