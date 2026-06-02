import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type PageShellProps = HTMLAttributes<HTMLDivElement>;

export function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <div className={cn("flex flex-col gap-5 animate-enter", className)} {...props}>
      {children}
    </div>
  );
}
