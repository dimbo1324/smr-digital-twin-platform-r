import type { TelemetryPoint, TrendSample } from "@/entities/telemetry/model/types";

const mockTimestamp = "2026-05-04T09:45:00+03:00";

export const mockTelemetryPoints: TelemetryPoint[] = [
  {
    tag: "TT-101",
    label: "Temperature",
    value: 286.4,
    unit: "C",
    quality: "GOOD",
    status: "mock",
    timestamp: mockTimestamp,
    trend: "stable",
  },
  {
    tag: "PT-101",
    label: "Pressure",
    value: 15.1,
    unit: "MPa",
    quality: "GOOD",
    status: "mock",
    timestamp: mockTimestamp,
    trend: "up",
  },
  {
    tag: "FT-101",
    label: "Flow",
    value: 118,
    unit: "kg/s",
    quality: "GOOD",
    status: "mock",
    timestamp: mockTimestamp,
    trend: "stable",
  },
  {
    tag: "LT-101",
    label: "Tank Level",
    value: 72,
    unit: "%",
    quality: "GOOD",
    status: "normal",
    timestamp: mockTimestamp,
    trend: "down",
  },
  {
    tag: "V-101.POS",
    label: "Valve Position",
    value: 64,
    unit: "%",
    quality: "UNCERTAIN",
    status: "warning",
    timestamp: mockTimestamp,
    trend: "stable",
  },
  {
    tag: "P-101.STATE",
    label: "Pump State",
    value: "Offline",
    unit: "",
    quality: "BAD",
    status: "offline",
    timestamp: mockTimestamp,
    trend: "stable",
  },
];

export function getMockTelemetryPoint(tag: string): TelemetryPoint | undefined {
  return mockTelemetryPoints.find((point) => point.tag === tag);
}

export function formatTelemetryValue(point: TelemetryPoint | undefined): string {
  if (!point) {
    return "N/A";
  }

  if (point.unit === "%") {
    return `${point.value}%`;
  }

  return point.unit ? `${point.value} ${point.unit}` : String(point.value);
}

export function getNumericTelemetryValue(tag: string, fallback = 0): number {
  const value = getMockTelemetryPoint(tag)?.value;
  return typeof value === "number" ? value : fallback;
}

export const mockTelemetrySummary = {
  totalPoints: mockTelemetryPoints.length,
};

export const mockTrendSamples: TrendSample[] = [
  { time: "09:34", temperature: 281.4, pressure: 14.8, flow: 111, level: 76 },
  { time: "09:35", temperature: 282.1, pressure: 14.9, flow: 113, level: 75 },
  { time: "09:36", temperature: 283.2, pressure: 15.0, flow: 115, level: 75 },
  { time: "09:37", temperature: 284.0, pressure: 15.0, flow: 116, level: 74 },
  { time: "09:38", temperature: 284.7, pressure: 15.1, flow: 118, level: 74 },
  { time: "09:39", temperature: 285.5, pressure: 15.2, flow: 121, level: 73 },
  { time: "09:40", temperature: 286.2, pressure: 15.2, flow: 120, level: 73 },
  { time: "09:41", temperature: 286.8, pressure: 15.1, flow: 119, level: 72 },
  { time: "09:42", temperature: 286.1, pressure: 15.1, flow: 118, level: 72 },
  { time: "09:43", temperature: 285.9, pressure: 15.0, flow: 117, level: 72 },
  { time: "09:44", temperature: 286.3, pressure: 15.1, flow: 118, level: 72 },
  { time: "09:45", temperature: 286.4, pressure: 15.1, flow: 118, level: 72 },
];
