import { CheckCircle2 } from "lucide-react";
import { activeAlarms, historicalAlarms } from "@/entities/alarms/model/mockAlarms";
import { AlarmList } from "@/widgets/alarm-list/AlarmList";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const lifecycleStates = ["ACTIVE", "ACKNOWLEDGED", "CLEARED"] as const;

export function AlarmsPage() {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Active Alarm Panel</CardTitle>
            <CardDescription>
              Alarm lifecycle shell for future rule evaluation and acknowledgement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeAlarms.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-200" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-white">No active alarms</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  The MVP shell is running on mock data only. Alarm rules and live
                  lifecycle transitions will be connected in a later step.
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
            {lifecycleStates.map((state) => (
              <div
                key={state}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3"
              >
                <span className="text-sm text-zinc-200">{state}</span>
                <Badge
                  variant={
                    state === "ACTIVE"
                      ? "warning"
                      : state === "ACKNOWLEDGED"
                        ? "default"
                        : "success"
                  }
                >
                  mock
                </Badge>
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
    </>
  );
}
