import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { DashboardLiveOverviewProps } from "../types";
import { alarmBadge } from "../lib/statusLabels";
import { highestAlarmSeverity, newestAlarm } from "../lib/viewModel";
import { CompactMetric, PreviewText, StateNotice, SummaryRow } from "./primitives";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function AlarmSummaryCard({ alarms }: { alarms: DashboardLiveOverviewProps["alarms"] }) {
  const active = alarms.activeAlarms.filter((alarm) => alarm.status === "ACTIVE");
  const acknowledged = alarms.activeAlarms.filter((alarm) => alarm.status === "ACKNOWLEDGED");
  const latestActive = newestAlarm(alarms.activeAlarms);
  const latestCleared = newestAlarm(alarms.history);
  const highestSeverity = highestAlarmSeverity(alarms.activeAlarms);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Alarm Summary</CardTitle>
          <Badge
            variant={
              active.length > 0 ? "destructive" : acknowledged.length > 0 ? "warning" : "success"
            }
          >
            {alarms.state === "degraded" ? "Unavailable" : `${active.length} active`}
          </Badge>
        </div>
        <CardDescription>Real active alarm endpoint, excluding cleared history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alarms.state === "loading" ? (
          <StateNotice label="Loading alarm state..." />
        ) : alarms.state === "degraded" ? (
          <StateNotice label="Alarm data unavailable." tone="offline" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <CompactMetric label="ACTIVE" value={String(active.length)} />
              <CompactMetric label="ACK" value={String(acknowledged.length)} />
              <CompactMetric label="CLEARED" value={String(alarms.history.length)} />
            </div>
            <SummaryRow
              label="Highest severity"
              value={highestSeverity ?? "None"}
              badge={highestSeverity ? alarmBadge(highestSeverity) : "success"}
            />
            {latestActive ? (
              <PreviewText label={latestActive.tag} value={latestActive.message} />
            ) : latestCleared ? (
              <PreviewText
                label="Latest cleared"
                value={`${latestCleared.tag}: ${latestCleared.message}`}
              />
            ) : (
              <StateNotice label="No active alarms." tone="success" />
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/alarms">
                View alarms <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
