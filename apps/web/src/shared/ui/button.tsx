import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md text-[var(--font-size-sm)] font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-disabled/35 disabled:bg-disabled/10 disabled:text-disabled disabled:saturate-75",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.18)] hover:bg-primary/90 hover:shadow-[0_14px_34px_hsl(var(--primary)/0.18)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted hover:shadow-panel",
        outline:
          "border border-border/80 bg-card/70 text-foreground hover:bg-surface-elevated hover:shadow-panel",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-[var(--app-control-height-md)] px-3 py-1.5",
        sm: "h-[var(--app-control-height-sm)] px-2.5 text-[var(--font-size-xs)]",
        icon: "h-[var(--app-control-height-md)] w-[var(--app-control-height-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
