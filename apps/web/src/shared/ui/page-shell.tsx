import type { PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

interface PageShellProps extends PropsWithChildren {
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("flex flex-col gap-7 animate-enter", className)}>
      {children}
    </div>
  );
}
