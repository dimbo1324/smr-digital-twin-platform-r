import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva(
  "inline-flex w-fit max-w-full min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 text-left text-[var(--font-size-xs)] font-semibold leading-tight transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10 text-primary",
        secondary: "border-border/70 bg-secondary text-secondary-foreground",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        destructive: "border-danger/25 bg-danger/10 text-danger",
        outline: "border-border/80 bg-background/40 text-muted-foreground",
        info: "border-info/25 bg-info/10 text-info",
        mock: "border-mock/25 bg-mock/10 text-mock",
        offline: "border-offline/25 bg-offline/10 text-offline",
        healthy: "border-status-healthy/30 bg-status-healthy/10 text-status-healthy",
        degraded: "border-status-degraded/35 bg-status-degraded/10 text-status-degraded",
        disabled: "border-status-disabled/30 bg-status-disabled/10 text-status-disabled",
        simulation: "border-status-simulation/30 bg-status-simulation/10 text-status-simulation",
        fallback: "border-status-fallback/35 bg-status-fallback/10 text-status-fallback",
        connected: "border-status-connected/30 bg-status-connected/10 text-status-connected",
        disconnected:
          "border-status-disconnected/30 bg-status-disconnected/10 text-status-disconnected",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
