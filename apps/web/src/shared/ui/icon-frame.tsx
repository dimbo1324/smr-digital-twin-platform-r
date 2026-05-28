import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type IconTone = "primary" | "success" | "warning" | "danger" | "neutral" | "simulation";

const toneClasses: Record<IconTone, string> = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  neutral: "border-border/70 bg-surface-subtle text-muted-foreground",
  simulation: "border-mock/20 bg-mock/10 text-mock",
};

export function IconFrame({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}
