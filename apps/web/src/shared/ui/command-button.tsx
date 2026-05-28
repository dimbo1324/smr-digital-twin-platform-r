import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

export function CommandButton({
  loading = false,
  disabledReason,
  children,
  className,
  ...props
}: ButtonProps & {
  loading?: boolean;
  disabledReason?: string;
  children: ReactNode;
}) {
  const disabled = props.disabled || loading || Boolean(disabledReason);

  return (
    <Button
      {...props}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabledReason}
      className={cn("min-h-10 whitespace-nowrap", className)}
    >
      {loading ? "Working..." : children}
    </Button>
  );
}
