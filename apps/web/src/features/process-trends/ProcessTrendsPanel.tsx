import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockTrendSamples } from "@/entities/telemetry/model/mockTelemetry";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type TrendTag = "temperature" | "pressure" | "flow";

const tags: Array<{
  id: TrendTag;
  label: string;
  tag: string;
  unit: string;
  color: string;
}> = [
  {
    id: "temperature",
    label: "Temperature",
    tag: "TT-101",
    unit: "C",
    color: "#22d3ee",
  },
  {
    id: "pressure",
    label: "Pressure",
    tag: "PT-101",
    unit: "MPa",
    color: "#fbbf24",
  },
  {
    id: "flow",
    label: "Flow",
    tag: "FT-101",
    unit: "kg/s",
    color: "#34d399",
  },
];

export function ProcessTrendsPanel() {
  const [activeTag, setActiveTag] = useState<TrendTag>("temperature");
  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === activeTag) ?? tags[0],
    [activeTag],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Workspace</CardTitle>
        <CardDescription>
          Mock historian view for selected process telemetry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Button
              key={tag.id}
              variant={tag.id === activeTag ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTag(tag.id)}
            >
              {tag.tag} {tag.label}
            </Button>
          ))}
        </div>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={mockTrendSamples} margin={{ left: 0, right: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="rgba(212,212,216,0.7)"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                stroke="rgba(212,212,216,0.7)"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(24, 24, 27, 0.96)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "#fafafa",
                }}
              />
              <Line
                type="monotone"
                dataKey={selectedTag.id}
                name={`${selectedTag.tag} ${selectedTag.unit}`}
                stroke={selectedTag.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
