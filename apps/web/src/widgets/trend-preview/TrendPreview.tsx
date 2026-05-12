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
import { chartTheme } from "@/shared/config/chartTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function TrendPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Telemetry Preview</CardTitle>
        <CardDescription>
          Mock temperature, pressure, and flow values for the current shell.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] rounded-2xl border border-border/60 bg-surface-subtle/60 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={mockTrendSamples} margin={{ left: 0, right: 16 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="time"
                stroke={chartTheme.axis}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                stroke={chartTheme.axis}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={{
                  background: chartTheme.tooltipBackground,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: "14px",
                  color: chartTheme.tooltipText,
                  boxShadow: "var(--shadow-panel)",
                }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                name="TT-101 C"
                stroke={chartTheme.temperature}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pressure"
                name="PT-101 MPa"
                stroke={chartTheme.pressure}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="flow"
                name="FT-101 kg/s"
                stroke={chartTheme.flow}
                strokeWidth={2.5}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
