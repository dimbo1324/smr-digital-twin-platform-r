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
        "flex min-w-0 gap-3 rounded-2xl border border-border/70 bg-surface-elevated/65 p-4",
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
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{title}</p>
          <StatusBadge tone={tone} value={status} />
        </div>
        {description ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
        {source ? <SourceBadge source={displayLabel(source)} className="mt-3" /> : null}
      </div>
    </div>
  );
}
