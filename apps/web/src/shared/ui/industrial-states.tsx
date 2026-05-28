import type { ReactNode } from "react";
import { AlertTriangle, CircleDashed, Info, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/shared/ui/status-badge";
import { cn } from "@/shared/lib/cn";

export function SimulationOnlyNotice({ className, badgeLabel = "Simulation-only" }: { className?: string; badgeLabel?: string }) {
  return (
    <div className={cn("rounded-2xl border border-warning/25 bg-warning/10 p-4", className)}>
      <StatusBadge tone="simulation" value={badgeLabel} />
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Synthetic simulator data only. No real plant control, PLC/SCADA connectivity, production audit, or regulatory reporting.
      </p>
    </div>
  );
}

export function PermissionDeniedHint({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm leading-6 text-warning", className)} role="status" data-testid={testId}>
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ title, message, className }: { title: string; message?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-surface-subtle/60 p-5 text-sm", className)}>
      <div className="flex items-start gap-3">
        <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">{title}</p>
          {message ? <p className="mt-1 leading-6 text-muted-foreground">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function DegradedState({ title, message, className }: { title: string; message: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm", className)} role="status">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 leading-6 text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function InlineInfo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-2xl border border-border/70 bg-background/50 p-3 text-xs leading-5 text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
