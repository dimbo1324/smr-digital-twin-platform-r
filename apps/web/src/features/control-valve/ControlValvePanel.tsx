import { useState } from "react";
import { CheckCircle2, Clock3, Power, Send, SlidersHorizontal, XCircle } from "lucide-react";
import type { CommandRecord, CommandType } from "@/entities/commands/model/types";
import { sendCommand } from "@/entities/commands/api/commandsApi";
import type { TelemetryPoint } from "@/entities/telemetry/model/types";
import {
  findTelemetryByTag,
  formatTelemetryAge,
  formatTelemetryValue,
  getNumericTelemetryValue,
  getTelemetryAge,
  getTextTelemetryValue,
  telemetrySourceLabel,
} from "@/entities/telemetry/lib/selectors";
import { ApiError } from "@/shared/api/client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type DataState = "loading" | "connected" | "degraded";

export interface ControlValvePanelProps {
  telemetryPoints: TelemetryPoint[];
  dataState: DataState;
  onCommandComplete?: () => void;
}

type CommandFeedback =
  | { state: "idle"; message?: undefined; command?: undefined }
  | { state: "pending"; message: string; command?: undefined }
  | { state: "success"; message: string; command: CommandRecord }
  | { state: "error"; message: string; command?: undefined };

function clampValvePosition(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ControlValvePanel({
  telemetryPoints,
  dataState,
  onCommandComplete,
}: ControlValvePanelProps) {
  const valvePoint = findTelemetryByTag(telemetryPoints, "V-101.POS");
  const rawPosition = getNumericTelemetryValue(telemetryPoints, "V-101.POS", 0) ?? 0;
  const valvePosition = clampValvePosition(rawPosition);
  const [requestedPosition, setRequestedPosition] = useState(Math.round(valvePosition));
  const [feedback, setFeedback] = useState<CommandFeedback>({ state: "idle" });
  const valveState = getTextTelemetryValue(telemetryPoints, "V-101.STATE", "UNKNOWN");
  const sourceLabel = telemetrySourceLabel(valvePoint);
  const ageLabel = formatTelemetryAge(getTelemetryAge(telemetryPoints, "V-101.POS"));
  const sourceVariant = valvePoint?.source === "simulation" ? "success" : dataState === "degraded" ? "warning" : "mock";
  const isPending = feedback.state === "pending";
  const canSend = dataState === "connected" && !isPending;
  const positionInvalid = requestedPosition < 0 || requestedPosition > 100;

  const submitValveCommand = (commandType: CommandType, positionPercent?: number) => {
    setFeedback({ state: "pending", message: `${commandType} command is being sent...` });
    sendCommand({
      targetTag: "V-101",
      commandType,
      payload:
        commandType === "SET_POSITION"
          ? { positionPercent, reason: "operator_demo" }
          : { reason: "operator_demo" },
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
            <CardTitle>Control Valve V-101</CardTitle>
            <CardDescription>
              Simulation-only commands update in-memory actuator state and live telemetry.
            </CardDescription>
          </div>
          <Badge variant="warning">simulation only</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/10 to-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current position</p>
              <p className="mt-1 text-4xl font-semibold text-foreground">
                {Math.round(valvePosition * 10) / 10}%
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-foreground shadow-[0_14px_34px_hsl(var(--foreground)/0.08)]">
              <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Valve opening</span>
              <span className="font-mono font-medium text-foreground">
                {formatTelemetryValue(valvePoint)}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full border border-border/70 bg-background/70 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-mock to-warning shadow-[0_0_18px_hsl(var(--primary)/0.24)]"
                style={{ width: `${valvePosition}%` }}
              />
              <div
                className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-foreground/70"
                style={{ left: `${valvePosition}%` }}
              />
              <div className="absolute inset-y-0 left-1/4 w-px bg-border/70" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-border/70" />
              <div className="absolute inset-y-0 left-3/4 w-px bg-border/70" />
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <StatusItem label="State" value={valveState ?? "UNKNOWN"} variant="mock" />
            <StatusItem label="Quality" value={valvePoint?.quality ?? "MISSING"} />
            <StatusItem label="Source" value={sourceLabel} variant={sourceVariant} />
            <StatusItem label="Updated" value={ageLabel} />
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 p-3 text-xs leading-5 text-muted-foreground">
            Commands affect only the in-memory simulation. No real equipment, plant network, or safety-critical automation is connected.
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" disabled={!canSend} onClick={() => submitValveCommand("OPEN")}>
            <Power className="h-4 w-4" aria-hidden="true" />
            Open
          </Button>
          <Button variant="outline" disabled={!canSend} onClick={() => submitValveCommand("STOP")}>
            Stop
          </Button>
          <Button variant="outline" disabled={!canSend} onClick={() => submitValveCommand("CLOSE")}>
            Close
          </Button>
        </div>

        <div className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-xs font-medium text-muted-foreground">Set position</span>
              <input
                type="range"
                min={0}
                max={100}
                value={requestedPosition}
                onChange={(event) => setRequestedPosition(Number(event.target.value))}
                className="mt-3 w-full accent-primary"
                disabled={isPending}
              />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={requestedPosition}
                onChange={(event) => setRequestedPosition(Number(event.target.value))}
                className="h-10 w-24 rounded-full border border-border/80 bg-card/70 px-3 text-sm text-foreground"
                disabled={isPending}
              />
              <Button
                disabled={!canSend || positionInvalid}
                onClick={() => submitValveCommand("SET_POSITION", requestedPosition)}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Apply
              </Button>
            </div>
          </div>
          {positionInvalid ? (
            <p className="mt-2 text-xs text-danger">Position must be between 0 and 100.</p>
          ) : null}
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
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
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
  variant?: "outline" | "success" | "warning" | "mock";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Clock3 className="h-3 w-3" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <Badge variant={variant} className="mt-2">
        {value}
      </Badge>
    </div>
  );
}
