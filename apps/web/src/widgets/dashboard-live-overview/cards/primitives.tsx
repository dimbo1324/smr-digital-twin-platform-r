import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Clock3 } from "lucide-react";
import type { DashboardBadgeVariant } from "../lib/statusLabels";
import { Badge } from "@/shared/ui/badge";

export function SummaryRow({
  label,
  value,
  badge = "outline",
}: {
  label: string;
  value: string;
  badge?: DashboardBadgeVariant;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-elevated/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={badge}>{value}</Badge>
    </div>
  );
}

export function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function PreviewText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-subtle/60 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/80">{value}</p>
    </div>
  );
}

export function StateNotice({
  label,
  tone = "warning",
}: {
  label: string;
  tone?: "warning" | "offline" | "success";
}) {
  const iconTone =
    tone === "offline" ? "text-offline" : tone === "success" ? "text-success" : "text-warning";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-subtle/60 p-4 text-sm text-muted-foreground">
      <AlertTriangle className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function BoundaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function CapabilityList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "success" | "offline";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
      <Badge variant={variant}>{title}</Badge>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
