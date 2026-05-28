import { useEffect, useState } from "react";
import { Activity, Gauge, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { PIDStatus } from "@/entities/pid/model/types";
import { useUpdatePidConfig } from "@/entities/pid/api/useUpdatePidConfig";
import { ApiError } from "@/shared/api/client";
import { isRbacDenied } from "@/entities/auth/lib/permissions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface PidControllerPanelProps {
  pidStatus?: PIDStatus;
  state: "loading" | "connected" | "degraded";
  canUpdateConfig?: boolean;
  roleDeniedReason?: string;
}

type FormState = {
  setpoint: string;
  kp: string;
  ki: string;
  kd: string;
};

export function PidControllerPanel({
  pidStatus,
  state,
  canUpdateConfig = true,
  roleDeniedReason,
}: PidControllerPanelProps) {
  const mutation = useUpdatePidConfig();
  const [form, setForm] = useState<FormState>({
    setpoint: "",
    kp: "",
    ki: "",
    kd: "",
  });
  const [feedback, setFeedback] = useState<string>();
  const currentSetpoint = pidStatus?.setpoint;
  const currentKp = pidStatus?.kp;
  const currentKi = pidStatus?.ki;
  const currentKd = pidStatus?.kd;

  useEffect(() => {
    if (
      currentSetpoint === undefined ||
      currentKp === undefined ||
      currentKi === undefined ||
      currentKd === undefined
    ) {
      return;
    }
    setForm({
      setpoint: String(currentSetpoint),
      kp: String(currentKp),
      ki: String(currentKi),
      kd: String(currentKd),
    });
  }, [currentSetpoint, currentKp, currentKi, currentKd]);

  const validationError = validateForm(form);
  const mode = pidStatus?.mode ?? "MANUAL";
  const active = Boolean(pidStatus?.active);

  const submit = () => {
    const parsed = parseForm(form);
    if (!parsed) {
      return;
    }
    setFeedback(undefined);
    mutation
      .mutateAsync(parsed)
      .then((status) => {
        setFeedback(`TIC-101 PID settings applied. Setpoint ${status.setpoint} C.`);
      })
      .catch((error: unknown) => {
        const message =
          isRbacDenied(error)
            ? "Demo RBAC denied this PID configuration change for the current role."
            : error instanceof ApiError
            ? `${error.code ?? "PID_CONFIG_FAILED"}: ${error.message}`
            : error instanceof Error
              ? error.message
              : "PID configuration update failed";
        setFeedback(message);
      });
  };

  return (
    <Card data-testid="pid-controller-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>TIC-101 PID Controller</CardTitle>
            <CardDescription>
              Simulation-only PID loop: TT-101 temperature to V-101 valve target.
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={active ? "success" : "outline"} data-testid="pid-active-badge">
              {active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant={mode === "AUTO" ? "warning" : mode === "MANUAL" ? "success" : "offline"}>
              {mode}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
          <Metric label="PV TT-101" value={formatNumber(pidStatus?.processValue)} unit="C" />
          <Metric label="Setpoint" value={formatNumber(pidStatus?.setpoint)} unit="C" />
          <Metric label="Error" value={formatNumber(pidStatus?.error)} unit="C" testId="pid-error" />
          <Metric label="Output" value={formatNumber(pidStatus?.output)} unit="%" testId="pid-output" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
          <Metric label="P term" value={formatNumber(pidStatus?.pTerm)} unit="%" testId="pid-p-term" />
          <Metric label="I term" value={formatNumber(pidStatus?.iTerm)} unit="%" testId="pid-i-term" />
          <Metric label="D term" value={formatNumber(pidStatus?.dTerm)} unit="%" testId="pid-d-term" />
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface-subtle/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">PID status</p>
              <p className="mt-1 font-medium text-foreground" data-testid="pid-status">
                {state === "loading" ? "Loading" : pidStatus?.status ?? "Unavailable"}
              </p>
            </div>
            <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {mode === "AUTO"
              ? "PID owns V-101 output in AUTO mode and updates only in-memory simulation state."
              : mode === "DISABLED"
                ? "Controller output disabled."
                : "Switch TIC-101 to AUTO to let simulated PID control V-101."}
          </p>
          {pidStatus?.saturated ? (
            <p className="mt-2 text-xs text-warning">PID output is saturated at a configured limit.</p>
          ) : null}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
          <NumberField
            label="Setpoint C"
            value={form.setpoint}
            onChange={(setpoint) => setForm((current) => ({ ...current, setpoint }))}
            testId="pid-setpoint-input"
            disabled={!canUpdateConfig}
          />
          <NumberField
            label="Kp"
            value={form.kp}
            onChange={(kp) => setForm((current) => ({ ...current, kp }))}
            testId="pid-kp-input"
            disabled={!canUpdateConfig}
          />
          <NumberField
            label="Ki"
            value={form.ki}
            onChange={(ki) => setForm((current) => ({ ...current, ki }))}
            testId="pid-ki-input"
            disabled={!canUpdateConfig}
          />
          <NumberField
            label="Kd"
            value={form.kd}
            onChange={(kd) => setForm((current) => ({ ...current, kd }))}
            testId="pid-kd-input"
            disabled={!canUpdateConfig}
          />
        </div>

        {validationError ? <p className="text-xs text-danger" role="alert">{validationError}</p> : null}
        {state === "degraded" ? <p className="text-sm text-danger" role="alert">PID status is unavailable from the API.</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={state === "loading" || mutation.isPending || Boolean(validationError) || !canUpdateConfig}
            onClick={submit}
            data-testid="pid-apply-settings-button"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Apply PID settings
          </Button>
          <Button
            variant="outline"
            disabled={!pidStatus || mutation.isPending}
            onClick={() => {
              if (!pidStatus) return;
              setForm({
                setpoint: String(pidStatus.setpoint),
                kp: String(pidStatus.kp),
                ki: String(pidStatus.ki),
                kd: String(pidStatus.kd),
              });
              setFeedback("Local PID form reset to current simulation values.");
            }}
            data-testid="pid-reset-button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset form
          </Button>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/50 p-3 text-xs leading-5 text-muted-foreground">
          {pidStatus?.safetyDisclaimer ??
            "TIC-101 is a simulation-only PID controller for a synthetic thermal loop. It does not control real equipment."}
        </div>

        {!canUpdateConfig && roleDeniedReason ? (
          <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning" role="status">
            {roleDeniedReason}
          </p>
        ) : null}

        {feedback ? <p className="text-sm text-muted-foreground" role="status">{feedback}</p> : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, unit, testId }: { label: string; value: string; unit: string; testId?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card/50 p-3" data-testid={testId}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-foreground">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  testId,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        step="0.01"
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-full border border-border/80 bg-card/70 px-3 text-sm text-foreground"
        data-testid={testId}
        disabled={disabled}
      />
    </label>
  );
}

function parseForm(form: FormState) {
  const setpoint = Number(form.setpoint);
  const kp = Number(form.kp);
  const ki = Number(form.ki);
  const kd = Number(form.kd);
  if ([setpoint, kp, ki, kd].some((value) => Number.isNaN(value))) {
    return undefined;
  }
  return { setpoint, kp, ki, kd };
}

function validateForm(form: FormState) {
  const parsed = parseForm(form);
  if (!parsed) {
    return "PID settings must be numeric.";
  }
  if (parsed.setpoint < 270 || parsed.setpoint > 310) {
    return "Setpoint must be between 270 and 310 C.";
  }
  if (parsed.kp < 0 || parsed.ki < 0 || parsed.kd < 0) {
    return "Kp, Ki, and Kd must be non-negative.";
  }
  return undefined;
}

function formatNumber(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}
