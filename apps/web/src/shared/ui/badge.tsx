import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/10 text-cyan-100",
        secondary: "border-white/10 bg-white/10 text-zinc-200",
        success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
        warning: "border-amber-400/30 bg-amber-500/10 text-amber-200",
        destructive: "border-red-400/30 bg-red-500/10 text-red-200",
        outline: "border-white/20 bg-transparent text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
