import { LockKeyhole, Power, SlidersHorizontal } from "lucide-react";
import { getNumericTelemetryValue } from "@/entities/telemetry/model/mockTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

function clampValvePosition(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ControlValvePanel() {
  const valvePosition = clampValvePosition(getNumericTelemetryValue("V-101.POS"));
  const valvePositionLabel = `${valvePosition}%`;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Control Valve V-101</CardTitle>
            <CardDescription>
              Command controls are disabled until the backend command layer exists.
            </CardDescription>
          </div>
          <Badge variant="warning">manual locked</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/10 to-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Mock position</p>
              <p className="mt-1 text-4xl font-semibold text-foreground">
                {valvePositionLabel}
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
                {valvePositionLabel} open
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full border border-border/70 bg-background/70 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-mock to-warning shadow-[0_0_18px_hsl(var(--primary)/0.24)]"
                style={{ width: valvePositionLabel }}
              />
              <div
                className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-foreground/70"
                style={{ left: valvePositionLabel }}
              />
              <div className="absolute inset-y-0 left-1/4 w-px bg-border/70" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-border/70" />
              <div className="absolute inset-y-0 left-3/4 w-px bg-border/70" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            No simulated command channel connected.
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" disabled>
            <Power className="h-4 w-4" aria-hidden="true" />
            Open
          </Button>
          <Button variant="outline" disabled>
            Stop
          </Button>
          <Button variant="outline" disabled>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
