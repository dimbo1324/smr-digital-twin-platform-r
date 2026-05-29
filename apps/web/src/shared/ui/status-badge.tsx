import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/shared/ui/badge";
import { displayLabel } from "@/shared/lib/display-labels";
import { cn } from "@/shared/lib/cn";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export type StatusTone =
  | "healthy"
  | "warning"
  | "danger"
  | "neutral"
  | "degraded"
  | "disabled"
  | "simulation"
  | "fallback"
  | "connected"
  | "disconnected";

const toneVariant: Record<StatusTone, BadgeVariant> = {
  healthy: "success",
  warning: "warning",
  danger: "destructive",
  neutral: "outline",
  degraded: "degraded",
  disabled: "disabled",
  simulation: "simulation",
  fallback: "fallback",
  connected: "connected",
  disconnected: "disconnected",
};

function statusToneFromValue(value?: string): StatusTone {
  const normalized = value?.toLowerCase() ?? "";

  if (["connected", "healthy", "active", "running", "manual", "ok"].includes(normalized)) {
    return "healthy";
  }

  if (
    ["degraded", "fallback", "checking", "loading", "warning"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "degraded";
  }

  if (
    ["offline", "disabled", "unavailable", "disconnected", "missing"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "disabled";
  }

  if (["simulation", "synthetic", "demo"].some((token) => normalized.includes(token))) {
    return "simulation";
  }

  return "neutral";
}

export function StatusBadge({
  value,
  tone,
  className,
  children,
}: {
  value?: string;
  tone?: StatusTone;
  className?: string;
  children?: ReactNode;
}) {
  const resolvedTone = tone ?? statusToneFromValue(value);

  return (
    <Badge variant={toneVariant[resolvedTone]} className={cn("whitespace-nowrap", className)}>
      {children ?? displayLabel(value ?? "Unknown")}
    </Badge>
  );
}
