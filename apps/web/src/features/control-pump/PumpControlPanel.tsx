import { useState } from "react";
import { CheckCircle2, Gauge, Play, Square, XCircle } from "lucide-react";
import type { CommandRecord, CommandType } from "@/entities/commands/model/types";
import { useSendCommand } from "@/entities/commands/api/useSendCommand";
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
import { isRbacDenied } from "@/entities/auth/lib/permissions";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { CommandButton } from "@/shared/ui/command-button";
import { IconFrame } from "@/shared/ui/icon-frame";
import { InlineInfo, PermissionDeniedHint } from "@/shared/ui/industrial-states";
import { StatusBadge } from "@/shared/ui/status-badge";

type DataState = "loading" | "connected" | "degraded";

export interface PumpControlPanelProps {
  telemetryPoints: TelemetryDisplayPoint[];
  dataState: DataState;
  canSendCommand?: boolean;
  roleDeniedReason?: string;
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
  canSendCommand = true,
  roleDeniedReason,
  onCommandComplete,
}: PumpControlPanelProps) {
  const pumpStatePoint = findTelemetryByTag(telemetryPoints, "P-101.STATE");
  const pumpRpmPoint = findTelemetryByTag(telemetryPoints, "P-101.RPM");
  const pumpState = getTextTelemetryValue(telemetryPoints, "P-101.STATE", "UNKNOWN");
  const [feedback, setFeedback] = useState<CommandFeedback>({ state: "idle" });
  const commandMutation = useSendCommand();
  const canSend = dataState === "connected" && feedback.state !== "pending" && !commandMutation.isPending && canSendCommand;

  const submitPumpCommand = (commandType: CommandType) => {
    setFeedback({ state: "pending", message: `${commandType} command is being sent...` });
    commandMutation
      .mutateAsync({
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
          isRbacDenied(error)
            ? "Demo RBAC denied this pump command for the current role."
            : error instanceof ApiError
            ? `${error.code ?? "COMMAND_FAILED"}: ${error.message}`
            : error instanceof Error
              ? error.message
            : "Command request failed";
        setFeedback({ state: "error", message });
      });
  };

  return (
    <Card className="overflow-hidden" data-testid="pump-control-panel">
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
              <p className="mt-1 text-3xl font-semibold text-foreground" data-testid="pump-state">
                {pumpState}
              </p>
            </div>
            <IconFrame icon={Gauge} tone="primary" className="h-12 w-12" />
          </div>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-2 text-xs text-muted-foreground">
            <StatusItem label="RPM" value={formatTelemetryValue(pumpRpmPoint)} testId="pump-rpm" />
            <StatusItem label="Source" value={telemetrySourceLabel(pumpStatePoint)} variant={pumpStatePoint?.source === "simulation" ? "success" : "mock"} />
            <StatusItem label="Updated" value={formatTelemetryAge(getTelemetryAge(telemetryPoints, "P-101.STATE"))} />
          </div>

          <InlineInfo className="mt-4">
            Commands mutate only the local simulation state. They are not real plant control commands.
          </InlineInfo>
          {!canSendCommand && roleDeniedReason ? (
            <PermissionDeniedHint className="mt-3 text-xs" testId="pump-rbac-disabled-reason">
              {roleDeniedReason}
            </PermissionDeniedHint>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CommandButton loading={commandMutation.isPending} disabled={!canSend} onClick={() => submitPumpCommand("START")} data-testid="pump-start-button">
            <Play className="h-4 w-4" aria-hidden="true" />
            Start
          </CommandButton>
          <CommandButton
            variant="outline"
            loading={commandMutation.isPending}
            disabled={!canSend}
            onClick={() => submitPumpCommand("STOP")}
            data-testid="pump-stop-button"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </CommandButton>
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
    <div
      className="mt-4 flex items-start gap-2 rounded-2xl border border-border/70 bg-surface-subtle/70 p-3 text-sm text-foreground"
      data-testid="pump-command-feedback"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
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
  testId,
}: {
  label: string;
  value: string;
  variant?: "outline" | "success" | "mock";
  testId?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/50 px-3 py-2" data-testid={testId}>
      <span className="truncate">{label}</span>
      <StatusBadge value={value} tone={variant === "success" ? "connected" : variant === "mock" ? "simulation" : "neutral"} className="mt-2 max-w-full truncate" />
    </div>
  );
}
