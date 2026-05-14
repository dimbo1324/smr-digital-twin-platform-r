import type { components } from "@/shared/api/generated/schema";

export type TelemetryPoint = components["schemas"]["TelemetryPoint"];
export type TelemetryQuality = TelemetryPoint["quality"];

export type TelemetryStatus = "offline" | "mock" | "warning" | "normal";

export interface TelemetryDisplayPoint {
  tag: string;
  label: string;
  value: number | string;
  unit: string;
  quality: TelemetryQuality;
  status: TelemetryStatus;
  timestamp: string;
  trend: "up" | "down" | "stable";
  source?: string;
}

export interface TrendSample {
  time: string;
  temperature: number;
  pressure: number;
  flow: number;
  level: number;
}
