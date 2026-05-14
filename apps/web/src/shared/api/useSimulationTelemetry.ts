import { useQuery } from "@tanstack/react-query";
import type {
  TelemetryDisplayPoint,
  TelemetryPoint,
  TelemetryQuality,
  TelemetryStatus,
} from "@/entities/telemetry/model/types";
import type { SimulationAlarm, SimulationTelemetrySnapshot } from "@/entities/simulation/model/types";
import { useScenarioActions } from "@/entities/scenarios/api/useScenarioActions";
import { useScenarios } from "@/entities/scenarios/api/useScenarios";
import { apiGet } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";

export interface LiveTelemetryState {
  state: "loading" | "connected" | "degraded";
  points: TelemetryDisplayPoint[];
  updatedAt?: string;
  refresh: () => void;
}

export function useLatestTelemetry(refreshMs = 1000): LiveTelemetryState {
  const query = useQuery({
    queryKey: queryKeys.telemetry.latest,
    queryFn: ({ signal }) => apiGet<TelemetryPoint[]>("/api/v1/telemetry/latest", { signal }),
    refetchInterval: refreshMs,
  });

  const state: LiveTelemetryState["state"] = query.isLoading
    ? "loading"
    : query.isError || query.data?.meta.degraded
      ? "degraded"
      : "connected";

  return {
    state,
    points: query.data?.data.map(toTelemetryPoint) ?? [],
    updatedAt: query.data?.meta.timestamp,
    refresh: () => void query.refetch(),
  };
}

export function useTelemetryHistory(windowValue: string, refreshMs = 5000) {
  const query = useQuery({
    queryKey: queryKeys.telemetry.history(windowValue),
    queryFn: ({ signal }) =>
      apiGet<SimulationTelemetrySnapshot[]>(
        `/api/v1/telemetry/history?window=${encodeURIComponent(windowValue)}`,
        { signal },
      ),
    refetchInterval: refreshMs,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError || query.data?.meta.degraded
      ? "degraded"
      : "connected";

  return {
    history: query.data?.data ?? [],
    state,
    refresh: () => void query.refetch(),
  };
}

export function useActiveSimulationAlarms(refreshMs = 2000) {
  const query = useQuery({
    queryKey: queryKeys.alarms.active,
    queryFn: ({ signal }) => apiGet<SimulationAlarm[]>("/api/v1/alarms/active", { signal }),
    refetchInterval: refreshMs,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError || query.data?.meta.degraded
      ? "degraded"
      : "connected";

  return {
    alarms: query.data?.data ?? [],
    state,
    refresh: () => void query.refetch(),
  };
}

export function useSimulationScenarios() {
  const scenarios = useScenarios();
  const scenarioActions = useScenarioActions();

  return {
    scenarios: scenarios.scenarios,
    status: scenarioActions.status,
    state: scenarios.state,
    actions: scenarioActions.actions,
  };
}

function toTelemetryPoint(point: TelemetryPoint): TelemetryDisplayPoint {
  const value = point.value ?? point.valueText ?? "N/A";
  return {
    tag: point.tag,
    label: point.name,
    value,
    unit: point.unit,
    quality: point.quality,
    status: qualityToStatus(point.quality),
    timestamp: point.timestamp,
    trend: "stable",
    source: point.source,
  };
}

function qualityToStatus(quality: TelemetryQuality): TelemetryStatus {
  switch (quality) {
    case "BAD":
      return "offline";
    case "UNCERTAIN":
      return "warning";
    default:
      return "normal";
  }
}
