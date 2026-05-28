import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface IconFrameProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "muted";
  size?: "sm" | "md";
}

const toneClasses = {
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-info/25 bg-info/10 text-info",
  muted: "border-border/70 bg-surface-elevated text-muted-foreground",
};

export function IconFrame({
  icon: Icon,
  tone = "primary",
  size = "md",
  className,
  ...props
}: IconFrameProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border",
        size === "sm" ? "h-9 w-9" : "h-10 w-10",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <Icon className={cn(size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]")} aria-hidden="true" />
    </div>
  );
}
