import type { CommandRecord, SimulationEvent } from "@/entities/commands/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export interface CommandEventPanelProps {
  commands: CommandRecord[];
  events: SimulationEvent[];
  state: "loading" | "connected" | "degraded";
}

export function CommandEventPanel({ commands, events, state }: CommandEventPanelProps) {
  const latestCommands = commands.slice(-5).reverse();
  const latestEvents = events.slice(-5).reverse();

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Recent Commands</CardTitle>
            <CardDescription>In-memory simulation command history.</CardDescription>
          </div>
          <Badge variant={state === "connected" ? "success" : "warning"}>
            {state === "connected" ? "simulation history" : "history unavailable"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestCommands.length === 0 ? (
            <EmptyState label="No simulation commands yet." />
          ) : (
            latestCommands.map((command) => (
              <div key={command.id} className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{command.id}</span>
                  <Badge variant="mock">{command.targetTag}</Badge>
                  <Badge variant={statusVariant(command.status)}>{command.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-foreground">
                  {command.commandType} by {command.requestedBy}
                </p>
                {command.resultMessage || command.errorMessage ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {command.resultMessage || command.errorMessage}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Simulation-only command and equipment state events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestEvents.length === 0 ? (
            <EmptyState label="No simulation events yet." />
          ) : (
            latestEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{event.id}</span>
                  <Badge variant={event.severity === "ERROR" ? "destructive" : event.severity === "WARNING" ? "warning" : "outline"}>
                    {event.severity}
                  </Badge>
                  {event.targetTag ? <Badge variant="mock">{event.targetTag}</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-foreground">{event.type}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-subtle/60 p-5 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function statusVariant(status: CommandRecord["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "REJECTED":
    case "FAILED":
      return "destructive" as const;
    case "IN_PROGRESS":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}
