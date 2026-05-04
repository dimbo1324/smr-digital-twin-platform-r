export type TelemetryQuality = "GOOD" | "BAD" | "UNCERTAIN";

export type TelemetryStatus = "offline" | "mock" | "warning" | "normal";

export interface TelemetryPoint {
  tag: string;
  label: string;
  value: number | string;
  unit: string;
  quality: TelemetryQuality;
  status: TelemetryStatus;
  timestamp: string;
  trend: "up" | "down" | "stable";
}

export interface TrendSample {
  time: string;
  temperature: number;
  pressure: number;
  flow: number;
  level: number;
}
