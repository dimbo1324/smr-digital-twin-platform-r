import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { EventRecord } from "@/entities/events/model/types";
import type { DashboardLiveOverviewProps } from "../types";
import { eventBadge } from "../lib/statusLabels";
import { newestEvents } from "../lib/viewModel";
import { StateNotice } from "./primitives";
import { formatRelativeTime } from "@/shared/lib/time";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function RecentEventsCard({ events }: { events: DashboardLiveOverviewProps["events"] }) {
  const latestEvents = newestEvents(events.events).slice(0, 6);

  return (
    <Card data-testid="dashboard-events-feed">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Recent Events</CardTitle>
          <Badge variant={events.state === "connected" ? "success" : events.state === "loading" ? "warning" : "offline"}>
            Live stream
          </Badge>
        </div>
        <CardDescription>Unified command, alarm, and simulation event stream.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3" data-testid="dashboard-recent-events-feed">
        {events.state === "loading" ? (
          <StateNotice label="Loading recent events..." />
        ) : events.state === "degraded" ? (
          <StateNotice label="Events unavailable." tone="offline" />
        ) : latestEvents.length === 0 ? (
          <StateNotice label="No events recorded yet." />
        ) : (
          <>
            {latestEvents.map((event) => (
              <EventPreview key={event.id} event={event} />
            ))}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/events">
                View all events <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EventPreview({ event }: { event: EventRecord }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={eventBadge(event.severity)}>{event.severity}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{event.type}</span>
        {event.targetTag ? (
          <span className="font-mono text-xs text-muted-foreground">{event.targetTag}</span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground/80">{event.message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{event.source}</span>
        <span>{formatRelativeTime(event.timestamp)}</span>
        {event.commandId ? <span className="font-mono">cmd {event.commandId.slice(0, 8)}</span> : null}
        {event.alarmId ? <span className="font-mono">alarm {event.alarmId.slice(0, 8)}</span> : null}
      </div>
    </div>
  );
}
