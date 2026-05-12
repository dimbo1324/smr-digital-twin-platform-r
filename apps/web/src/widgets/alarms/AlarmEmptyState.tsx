import { CheckCircle2 } from "lucide-react";

export function AlarmEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-success/20 bg-gradient-to-br from-success/10 via-card to-card p-8 text-center">
      <div className="rounded-full border border-success/25 bg-success/10 p-4 text-success shadow-[0_0_40px_hsl(var(--success)/0.18)]">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
