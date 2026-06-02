import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { displayLabel } from "@/shared/lib/display-labels";
import { cn } from "@/shared/lib/cn";

export function KpiCard({
  label,
  value,
  unit,
  helperText,
  source,
  status,
  testId,
  className,
  mask = false,
  formatValue = true,
}: {
  label: string;
  value: string | number;
  unit?: string;
  helperText?: string;
  source?: string;
  status?: StatusTone;
  testId?: string;
  className?: string;
  mask?: boolean;
  formatValue?: boolean;
}) {
  const shownValue = formatValue ? displayLabel(String(value)) : String(value);

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border/80 bg-surface-raised/65 p-[var(--app-card-padding)] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
        className,
      )}
      data-testid={testId}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 text-[var(--font-size-xs)] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {status ? <StatusBadge tone={status} value={String(value)} /> : null}
      </div>
      <p
        className="mt-1.5 min-w-0 truncate text-xl font-semibold leading-tight text-foreground"
        data-visual-mask={mask ? true : undefined}
      >
        {shownValue}
        {unit ? (
          <span className="ml-1 text-[var(--font-size-sm)] font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
      {helperText || source ? (
        <p className="mt-1.5 min-w-0 truncate text-[var(--font-size-xs)] text-muted-foreground">
          {helperText ?? displayLabel(source ?? "")}
        </p>
      ) : null}
    </div>
  );
}
