import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva(
  "inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs font-medium leading-snug transition-colors",
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
        healthy: "border-success/25 bg-success/10 text-success",
        degraded: "border-warning/30 bg-warning/10 text-warning",
        disabled: "border-offline/25 bg-offline/10 text-offline",
        simulation: "border-mock/25 bg-mock/10 text-mock",
        fallback: "border-warning/30 bg-warning/10 text-warning",
        connected: "border-success/25 bg-success/10 text-success",
        disconnected: "border-offline/25 bg-offline/10 text-offline",
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
