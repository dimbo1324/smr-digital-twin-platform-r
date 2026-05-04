import { Activity, Bell, Database, Server } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

interface SummaryItem {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone: string;
}

const items: SummaryItem[] = [
  {
    label: "Reactor Module Status",
    value: "Not Connected",
    detail: "No real plant interface",
    icon: Server,
    tone: "text-zinc-300",
  },
  {
    label: "Thermal Loop",
    value: "Mock",
    detail: "Static process model shell",
    icon: Activity,
    tone: "text-cyan-200",
  },
  {
    label: "Active Alarms",
    value: "0",
    detail: "Historical examples only",
    icon: Bell,
    tone: "text-emerald-200",
  },
  {
    label: "Telemetry Points",
    value: "6",
    detail: "TT, PT, FT, LT, valve, pump",
    icon: Database,
    tone: "text-amber-200",
  },
];

export function StatusSummary() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="hover:border-white/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <item.icon className={`h-5 w-5 ${item.tone}`} aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{item.detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
