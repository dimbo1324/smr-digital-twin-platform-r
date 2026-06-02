import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  stickyHeader?: boolean;
};

export function PageShell({
  children,
  className,
  title,
  eyebrow,
  description,
  status,
  actions,
  secondaryActions,
  stickyHeader = false,
  ...props
}: PageShellProps) {
  const hasHeader = title || eyebrow || description || status || actions || secondaryActions;

  return (
    <div className={cn("flex min-w-0 flex-col gap-4 animate-enter", className)} {...props}>
      {hasHeader ? (
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)] sm:flex-row sm:items-start sm:justify-between",
            stickyHeader && "sticky top-[4.25rem] z-20 backdrop-blur-xl",
          )}
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {eyebrow ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {eyebrow}
                </span>
              ) : null}
              {status}
            </div>
            {title ? (
              <h2 className="mt-1 text-[var(--font-size-xl)] font-semibold leading-tight text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-4xl text-[var(--font-size-sm)] leading-normal text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions || secondaryActions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
              {secondaryActions}
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
