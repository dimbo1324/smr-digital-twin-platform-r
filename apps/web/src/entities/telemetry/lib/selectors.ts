import type { TelemetryDisplayPoint, TelemetryQuality } from "@/entities/telemetry/model/types";

export function findTelemetryByTag(
  points: TelemetryDisplayPoint[],
  tag: string,
): TelemetryDisplayPoint | undefined {
  return points.find((point) => point.tag === tag);
}

export function getNumericTelemetryValue(
  points: TelemetryDisplayPoint[],
  tag: string,
  fallback?: number,
): number | undefined {
  const value = findTelemetryByTag(points, tag)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getTextTelemetryValue(
  points: TelemetryDisplayPoint[],
  tag: string,
  fallback?: string,
): string | undefined {
  const value = findTelemetryByTag(points, tag)?.value;
  return typeof value === "string" ? value : fallback;
}

export function getTelemetryQuality(
  points: TelemetryDisplayPoint[],
  tag: string,
): TelemetryQuality | undefined {
  return findTelemetryByTag(points, tag)?.quality;
}

export function getTelemetryAge(points: TelemetryDisplayPoint[], tag: string): number | undefined {
  const timestamp = findTelemetryByTag(points, tag)?.timestamp;
  if (!timestamp) {
    return undefined;
  }

  const ageMs = Date.now() - new Date(timestamp).getTime();
  return Number.isFinite(ageMs) ? Math.max(0, ageMs) : undefined;
}

export function formatTelemetryValue(point: TelemetryDisplayPoint | undefined): string {
  if (!point) {
    return "N/A";
  }

  if (typeof point.value === "number") {
    const rounded = Math.round(point.value * 10) / 10;
    return point.unit ? `${rounded} ${point.unit}` : String(rounded);
  }

  return point.unit ? `${point.value} ${point.unit}` : String(point.value);
}

export function formatTelemetryAge(ageMs: number | undefined): string {
  if (ageMs === undefined) {
    return "No timestamp";
  }

  if (ageMs < 1000) {
    return "just now";
  }

  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export function telemetrySourceLabel(point: TelemetryDisplayPoint | undefined): string {
  if (!point) {
    return "missing";
  }

  if (point.source === "simulation") {
    return "simulation";
  }

  if (point.source?.includes("demo-fallback") || point.source?.includes("mock")) {
    return "mock";
  }

  return point.source ?? "fallback";
}
