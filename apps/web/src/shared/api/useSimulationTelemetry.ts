import { useEffect, useMemo, useState } from "react";
import type { TelemetryPoint, TelemetryQuality, TelemetryStatus } from "@/entities/telemetry/model/types";
import type {
  SimulationAlarm,
  SimulationScenario,
  SimulationStatus,
  SimulationTelemetrySnapshot,
} from "@/entities/simulation/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

interface ApiTelemetryPoint {
  tag: string;
  name: string;
  value?: number;
  valueText?: string;
  unit: string;
  quality: TelemetryQuality;
  timestamp: string;
  source: string;
}

export interface LiveTelemetryState {
  state: "loading" | "connected" | "degraded";
  points: TelemetryPoint[];
  updatedAt?: string;
}

export function useLatestTelemetry(refreshMs = 1000): LiveTelemetryState {
  const [state, setState] = useState<LiveTelemetryState>({ state: "loading", points: [] });

  useEffect(() => {
    let mounted = true;
    const load = () => {
      apiGet<ApiTelemetryPoint[]>("/api/v1/telemetry/latest")
        .then((response) => {
          if (!mounted) {
            return;
          }
          setState({
            state: response.meta.degraded ? "degraded" : "connected",
            points: response.data.map(toTelemetryPoint),
            updatedAt: response.meta.timestamp,
          });
        })
        .catch(() => {
          if (mounted) {
            setState((current) => ({ ...current, state: "degraded" }));
          }
        });
    };

    load();
    const interval = window.setInterval(load, refreshMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [refreshMs]);

  return state;
}

export function useTelemetryHistory(windowValue: string, refreshMs = 5000) {
  const [history, setHistory] = useState<SimulationTelemetrySnapshot[]>([]);
  const [state, setState] = useState<"loading" | "connected" | "degraded">("loading");

  useEffect(() => {
    let mounted = true;
    const load = () => {
      apiGet<SimulationTelemetrySnapshot[]>(`/api/v1/telemetry/history?window=${windowValue}`)
        .then((response) => {
          if (!mounted) {
            return;
          }
          setHistory(response.data);
          setState(response.meta.degraded ? "degraded" : "connected");
        })
        .catch(() => {
          if (mounted) {
            setState("degraded");
          }
        });
    };

    load();
    const interval = window.setInterval(load, refreshMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [refreshMs, windowValue]);

  return { history, state };
}

export function useActiveSimulationAlarms(refreshMs = 2000) {
  const [alarms, setAlarms] = useState<SimulationAlarm[]>([]);
  const [state, setState] = useState<"loading" | "connected" | "degraded">("loading");

  useEffect(() => {
    let mounted = true;
    const load = () => {
      apiGet<SimulationAlarm[]>("/api/v1/alarms/active")
        .then((response) => {
          if (!mounted) {
            return;
          }
          setAlarms(response.data);
          setState(response.meta.degraded ? "degraded" : "connected");
        })
        .catch(() => {
          if (mounted) {
            setState("degraded");
          }
        });
    };

    load();
    const interval = window.setInterval(load, refreshMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [refreshMs]);

  return { alarms, state };
}

export function useSimulationScenarios() {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [status, setStatus] = useState<SimulationStatus | undefined>();
  const [state, setState] = useState<"loading" | "connected" | "degraded">("loading");

  useEffect(() => {
    apiGet<SimulationScenario[]>("/api/v1/simulation/scenarios")
      .then((response) => {
        setScenarios(response.data);
        setState("connected");
      })
      .catch(() => setState("degraded"));
  }, []);

  const actions = useMemo(
    () => ({
      start: (name: string) =>
        apiPost<SimulationStatus>(`/api/v1/simulation/scenarios/${name}/start`).then((response) => {
          setStatus(response.data);
          return response.data;
        }),
      stop: () =>
        apiPost<SimulationStatus>("/api/v1/simulation/scenarios/stop").then((response) => {
          setStatus(response.data);
          return response.data;
        }),
      reset: () =>
        apiPost<SimulationStatus>("/api/v1/simulation/reset").then((response) => {
          setStatus(response.data);
          return response.data;
        }),
    }),
    [],
  );

  return { scenarios, status, state, actions };
}

function toTelemetryPoint(point: ApiTelemetryPoint): TelemetryPoint {
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
