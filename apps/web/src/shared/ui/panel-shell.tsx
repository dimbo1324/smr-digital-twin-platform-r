import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { IconFrame } from "@/shared/ui/icon-frame";
import { cn } from "@/shared/lib/cn";

export function PanelShell({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  status,
  actions,
  children,
  testId,
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  status?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)} data-testid={testId}>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? <IconFrame icon={Icon} tone="primary" /> : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-[var(--font-size-xs)] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <CardTitle>{title}</CardTitle>
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5 sm:justify-end">
          {status}
          {actions}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
