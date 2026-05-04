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
        <div className="h-[280px]">
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
                dataKey="temperature"
                name="TT-101 C"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pressure"
                name="PT-101 MPa"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="flow"
                name="FT-101 kg/s"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
