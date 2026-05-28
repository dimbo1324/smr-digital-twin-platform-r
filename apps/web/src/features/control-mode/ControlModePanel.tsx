import { useState } from "react";
import { Bot, Hand, PowerOff, ShieldCheck } from "lucide-react";
import type { ControlMode, ControlStatus } from "@/entities/control/model/types";
import { useSetControlMode } from "@/entities/control/api/useSetControlMode";
import { ApiError } from "@/shared/api/client";
import { isRbacDenied } from "@/entities/auth/lib/permissions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface ControlModePanelProps {
  controlStatus?: ControlStatus;
  state: "loading" | "connected" | "degraded";
  canChangeMode?: boolean;
  roleDeniedReason?: string;
}

const modeCopy: Record<ControlMode, string> = {
  MANUAL: "Direct simulation-only operator commands to V-101 are allowed.",
  AUTO: "AUTO reserves V-101 for simulation-only TIC-101 PID output.",
  DISABLED: "Control output is disabled in the simulation.",
};

export function ControlModePanel({
  controlStatus,
  state,
  canChangeMode = true,
  roleDeniedReason,
}: ControlModePanelProps) {
  const mutation = useSetControlMode();
  const [feedback, setFeedback] = useState<string>();
  const mode = controlStatus?.mode ?? "MANUAL";
  const authority = controlStatus?.authority ?? "USER";

  const setMode = (nextMode: ControlMode) => {
    setFeedback(undefined);
    mutation
      .mutateAsync({
        mode: nextMode,
        reason: modeCopy[nextMode],
      })
      .then((status) => {
        setFeedback(`TIC-101 switched to ${status.mode}.`);
      })
      .catch((error: unknown) => {
        const message =
          isRbacDenied(error)
            ? "Demo RBAC denied this control mode change for the current role."
            : error instanceof ApiError
            ? `${error.code ?? "CONTROL_MODE_FAILED"}: ${error.message}`
            : error instanceof Error
              ? error.message
              : "Control mode update failed";
        setFeedback(message);
      });
  };

  return (
    <Card data-testid="control-mode-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>TIC-101 Control Mode</CardTitle>
            <CardDescription>
              Simulation-only arbitration for direct V-101 commands and TIC-101 PID authority.
            </CardDescription>
          </div>
          <Badge variant={mode === "MANUAL" ? "success" : mode === "AUTO" ? "warning" : "offline"}>
            {mode}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
          <StatusTile label="Controller" value={controlStatus?.controllerTag ?? "TIC-101"} />
          <StatusTile label="Authority" value={authority} testId="control-authority-current" />
          <StatusTile label="Controlled variable" value={controlStatus?.controlledVariableTag ?? "TT-101"} />
          <StatusTile label="Manipulated variable" value={controlStatus?.manipulatedVariableTag ?? "V-101.POS"} />
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface-subtle/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Current mode</p>
              <p className="mt-1 text-2xl font-semibold text-foreground" data-testid="control-mode-current">
                {state === "loading" ? "Loading" : mode}
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{modeCopy[mode]}</p>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="control-mode-pid-status">
            PID implemented: {controlStatus?.pidImplemented ? "yes" : "no"}. AUTO mode applies only to in-memory simulation state.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ModeButton
            mode="MANUAL"
            activeMode={mode}
            disabled={mutation.isPending || state === "loading" || !canChangeMode}
            onClick={setMode}
            testId="control-mode-manual-button"
          />
          <ModeButton
            mode="AUTO"
            activeMode={mode}
            disabled={mutation.isPending || state === "loading" || !canChangeMode}
            onClick={setMode}
            testId="control-mode-auto-button"
          />
          <ModeButton
            mode="DISABLED"
            activeMode={mode}
            disabled={mutation.isPending || state === "loading" || !canChangeMode}
            onClick={setMode}
            testId="control-mode-disabled-button"
          />
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/50 p-3 text-xs leading-5 text-muted-foreground">
          {controlStatus?.safetyDisclaimer ?? "Simulation-only interface. No real plant control."}
        </div>

        {!canChangeMode && roleDeniedReason ? (
          <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning" role="status">
            {roleDeniedReason}
          </p>
        ) : null}

        {state === "degraded" ? (
          <p className="text-sm text-danger">Control mode status is unavailable from the API.</p>
        ) : null}
        {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      </CardContent>
    </Card>
  );
}

function ModeButton({
  mode,
  activeMode,
  disabled,
  onClick,
  testId,
}: {
  mode: ControlMode;
  activeMode: ControlMode;
  disabled: boolean;
  onClick: (mode: ControlMode) => void;
  testId: string;
}) {
  const Icon = mode === "MANUAL" ? Hand : mode === "AUTO" ? Bot : PowerOff;
  return (
    <Button
      variant={mode === activeMode ? "default" : "outline"}
      disabled={disabled || mode === activeMode}
      onClick={() => onClick(mode)}
      data-testid={testId}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {mode}
    </Button>
  );
}

function StatusTile({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card/50 p-3" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
