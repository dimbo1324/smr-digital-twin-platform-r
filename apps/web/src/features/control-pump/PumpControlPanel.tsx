import { useState } from "react";
import { CheckCircle2, Gauge, Play, Square, XCircle } from "lucide-react";
import type { CommandRecord, CommandType } from "@/entities/commands/model/types";
import { sendCommand } from "@/entities/commands/api/commandsApi";
import type { TelemetryDisplayPoint } from "@/entities/telemetry/model/types";
import {
  findTelemetryByTag,
  formatTelemetryAge,
  formatTelemetryValue,
  getTelemetryAge,
  getTextTelemetryValue,
  telemetrySourceLabel,
} from "@/entities/telemetry/lib/selectors";
import { ApiError } from "@/shared/api/client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type DataState = "loading" | "connected" | "degraded";

export interface PumpControlPanelProps {
  telemetryPoints: TelemetryDisplayPoint[];
  dataState: DataState;
  onCommandComplete?: () => void;
}

type CommandFeedback =
  | { state: "idle"; message?: undefined; command?: undefined }
  | { state: "pending"; message: string; command?: undefined }
  | { state: "success"; message: string; command: CommandRecord }
  | { state: "error"; message: string; command?: undefined };

export function PumpControlPanel({
  telemetryPoints,
  dataState,
  onCommandComplete,
}: PumpControlPanelProps) {
  const pumpStatePoint = findTelemetryByTag(telemetryPoints, "P-101.STATE");
  const pumpRpmPoint = findTelemetryByTag(telemetryPoints, "P-101.RPM");
  const pumpState = getTextTelemetryValue(telemetryPoints, "P-101.STATE", "UNKNOWN");
  const [feedback, setFeedback] = useState<CommandFeedback>({ state: "idle" });
  const canSend = dataState === "connected" && feedback.state !== "pending";

  const submitPumpCommand = (commandType: CommandType) => {
    setFeedback({ state: "pending", message: `${commandType} command is being sent...` });
    sendCommand({
      targetTag: "P-101",
      commandType,
      payload: { reason: "operator_demo" },
    })
      .then((command) => {
        setFeedback({
          state: "success",
          message: command.resultMessage || `${command.commandType} accepted by simulation`,
          command,
        });
        onCommandComplete?.();
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError
            ? `${error.code ?? "COMMAND_FAILED"}: ${error.message}`
            : "Command request failed";
        setFeedback({ state: "error", message });
      });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Circulation Pump P-101</CardTitle>
            <CardDescription>
              Simulation-only pump commands update pump state, RPM, and loop flow.
            </CardDescription>
          </div>
          <Badge variant="warning">simulation only</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current state</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{pumpState}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-foreground shadow-[0_14px_34px_hsl(var(--foreground)/0.08)]">
              <Gauge className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <StatusItem label="RPM" value={formatTelemetryValue(pumpRpmPoint)} />
            <StatusItem label="Source" value={telemetrySourceLabel(pumpStatePoint)} variant={pumpStatePoint?.source === "simulation" ? "success" : "mock"} />
            <StatusItem label="Updated" value={formatTelemetryAge(getTelemetryAge(telemetryPoints, "P-101.STATE"))} />
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 p-3 text-xs leading-5 text-muted-foreground">
            Commands mutate only the local simulation state. They are not real plant control commands.
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button disabled={!canSend} onClick={() => submitPumpCommand("START")}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Start
          </Button>
          <Button variant="outline" disabled={!canSend} onClick={() => submitPumpCommand("STOP")}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </Button>
        </div>

        <CommandFeedbackView feedback={feedback} />
      </CardContent>
    </Card>
  );
}

function CommandFeedbackView({ feedback }: { feedback: CommandFeedback }) {
  if (feedback.state === "idle") {
    return null;
  }

  const isError = feedback.state === "error";
  const isSuccess = feedback.state === "success";
  return (
    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/70 bg-surface-subtle/70 p-3 text-sm text-foreground">
      {isError ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      ) : isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      )}
      <span>{feedback.message}</span>
    </div>
  );
}

function StatusItem({
  label,
  value,
  variant = "outline",
}: {
  label: string;
  value: string;
  variant?: "outline" | "success" | "mock";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-2">
      <span>{label}</span>
      <Badge variant={variant} className="mt-2">
        {value}
      </Badge>
    </div>
  );
}
