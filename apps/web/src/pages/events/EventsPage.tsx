import { useMemo, useState } from "react";
import { Activity, ListFilter, ScrollText } from "lucide-react";
import type { EventRecord } from "@/entities/events/model/types";
import { useRecentEvents } from "@/entities/events/api/useRecentEvents";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";
import { timestampMs } from "@/shared/lib/time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

type SortOrder = "newest" | "oldest";

const severityVariant: Record<string, "outline" | "warning" | "destructive"> = {
  INFO: "outline",
  WARNING: "warning",
  ERROR: "destructive",
  CRITICAL: "destructive",
};

export function EventsPage() {
  const { events, state, refresh } = useRecentEvents();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const severities = useOptions(events.map((event) => event.severity));
  const types = useOptions(events.map((event) => event.type));
  const sources = useOptions(events.map((event) => event.source));

  const visibleEvents = useMemo(() => {
    return events
      .filter((event) => severityFilter === "all" || event.severity === severityFilter)
      .filter((event) => typeFilter === "all" || event.type === typeFilter)
      .filter((event) => sourceFilter === "all" || event.source === sourceFilter)
      .sort((left, right) => {
        const diff = timestampMs(right.timestamp) - timestampMs(left.timestamp);
        return sortOrder === "newest" ? diff : -diff;
      });
  }, [events, severityFilter, sourceFilter, sortOrder, typeFilter]);

  return (
    <PageShell>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-panel">
          <Badge variant={state === "connected" ? "success" : "warning"}>
            {state === "connected" ? "Unified event stream" : "Event stream unavailable"}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
            Events page for command, alarm, and simulation operations.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            This view shows the in-memory simulation event stream. It is an operator workflow simulator,
            not a real plant event log or compliance archive.
          </p>
        </div>

        <div className="grid gap-3 rounded-3xl border border-border/70 bg-surface-elevated/70 p-5">
          <SummaryItem label="Total events" value={String(events.length)} />
          <SummaryItem label="Visible" value={String(visibleEvents.length)} />
          <SummaryItem label="Storage" value="in-memory" />
        </div>
      </section>

      <Card>
        <CardHeader className="flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CardTitle>Event Filters</CardTitle>
            <CardDescription>Filter by severity, type, source, and timestamp order.</CardDescription>
          </div>
          <Button variant="outline" onClick={refresh}>
            <Activity className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <FilterSelect label="Severity" value={severityFilter} values={severities} onChange={setSeverityFilter} />
            <FilterSelect label="Type" value={typeFilter} values={types} onChange={setTypeFilter} />
            <FilterSelect label="Source" value={sourceFilter} values={sources} onChange={setSourceFilter} />
            <label className="text-xs font-medium text-muted-foreground">
              Sort
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className="mt-2 h-10 w-full rounded-full border border-border/80 bg-card/70 px-3 text-sm text-foreground"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unified Event Stream</CardTitle>
          <CardDescription>Command, alarm, and system simulation events.</CardDescription>
        </CardHeader>
        <CardContent>
          {state === "loading" ? (
            <StatePanel title="Loading events" description="Reading recent events from the API." />
          ) : state === "degraded" ? (
            <StatePanel title="Events unavailable" description="The API could not return the recent event stream." />
          ) : visibleEvents.length === 0 ? (
            <StatePanel title="No events recorded yet" description="Trigger a command or alarm scenario to populate the event stream." />
          ) : (
            <EventsTable events={visibleEvents} />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function EventsTable({ events }: { events: EventRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Metadata</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant={severityVariant[event.severity] ?? "outline"}>{event.severity}</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap font-mono text-xs text-foreground">{event.type}</TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{event.source}</TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {event.targetTag ?? event.commandId ?? event.alarmId ?? "system"}
            </TableCell>
            <TableCell className="min-w-[260px] text-sm text-foreground/80">{event.message}</TableCell>
            <TableCell className="min-w-[220px] text-xs text-muted-foreground">
              {event.commandId ? <div>command: {event.commandId}</div> : null}
              {event.alarmId ? <div>alarm: {event.alarmId}</div> : null}
              {event.metadata ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-primary">metadata</summary>
                  <pre className="mt-2 max-w-[260px] overflow-auto rounded-xl bg-background/60 p-2">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </details>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-full border border-border/80 bg-card/70 px-3 text-sm text-foreground"
      >
        <option value="all">All</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatePanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-border/70 bg-surface-subtle/60 p-8 text-center">
      <div className="rounded-full border border-border/70 bg-card p-4 text-primary">
        <ScrollText className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}

function useOptions(values: string[]) {
  return useMemo(() => Array.from(new Set(values)).sort(), [values]);
}
