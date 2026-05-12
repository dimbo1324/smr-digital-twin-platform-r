import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

export interface AlarmSummary {
  active: number;
  unacknowledged: number;
  acknowledged: number;
  critical: number;
  events: number;
}

const items = [
  { key: "active", label: "Active", tone: "warning" },
  { key: "unacknowledged", label: "Unacknowledged", tone: "destructive" },
  { key: "acknowledged", label: "Acknowledged", tone: "info" },
  { key: "critical", label: "Critical", tone: "destructive" },
  { key: "events", label: "Events", tone: "mock" },
] as const;

export function AlarmSummaryCards({ summary }: { summary: AlarmSummary }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4">
            <Badge variant={item.tone}>{item.label}</Badge>
            <p className="mt-4 text-3xl font-semibold text-foreground">
              {summary[item.key]}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
