import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type PageShellProps = HTMLAttributes<HTMLDivElement>;

export function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <div className={cn("flex min-h-0 flex-none flex-col gap-4 animate-enter lg:gap-5", className)} {...props}>
      {children}
    </div>
  );
}
