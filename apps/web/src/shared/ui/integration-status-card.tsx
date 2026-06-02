import type { LucideIcon } from "lucide-react";
import { IconFrame } from "@/shared/ui/icon-frame";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { SourceBadge } from "@/shared/ui/source-badge";
import { displayLabel } from "@/shared/lib/display-labels";
import { cn } from "@/shared/lib/cn";

export function IntegrationStatusCard({
  title,
  description,
  status,
  source,
  icon,
  tone = "neutral",
  testId,
  className,
}: {
  title: string;
  description?: string;
  status: string;
  source?: string;
  icon?: LucideIcon;
  tone?: StatusTone;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-2.5 rounded-lg border border-border/80 bg-surface-raised/65 p-[var(--app-card-padding)]",
        className,
      )}
      data-testid={testId}
    >
      {icon ? (
        <IconFrame
          icon={icon}
          tone={
            tone === "healthy" || tone === "connected"
              ? "success"
              : tone === "warning" || tone === "degraded"
                ? "warning"
                : "primary"
          }
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-[var(--font-size-sm)] font-semibold text-foreground">
            {title}
          </p>
          <StatusBadge tone={tone} value={status} />
        </div>
        {description ? (
          <p className="mt-1.5 text-[var(--font-size-xs)] leading-normal text-muted-foreground">
            {description}
          </p>
        ) : null}
        {source ? <SourceBadge source={displayLabel(source)} className="mt-2" /> : null}
      </div>
    </div>
  );
}
