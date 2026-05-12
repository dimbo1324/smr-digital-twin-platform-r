import { useCallback, useEffect, useMemo, useState } from "react";
import type { Alarm, AlarmEvent } from "@/entities/alarms/model/types";
import { apiGet, apiPost } from "@/shared/api/client";

const ALARM_INVALIDATED_EVENT = "smr:alarm-data-invalidated";

type ResourceState = "loading" | "connected" | "degraded";

interface AlarmListState<T> {
  data: T[];
  state: ResourceState;
  updatedAt?: string;
}

interface AlarmItemState<T> {
  data?: T;
  state: ResourceState;
  updatedAt?: string;
}

export function invalidateAlarmData() {
  window.dispatchEvent(new Event(ALARM_INVALIDATED_EVENT));
}

export function useActiveAlarms(refreshMs = 2500) {
  return useAlarmList<Alarm>("/api/v1/alarms/active", refreshMs);
}

export function useAlarms(refreshMs = 4000) {
  return useAlarmList<Alarm>("/api/v1/alarms", refreshMs);
}

export function useAlarmEvents(limit = 100, refreshMs = 5000) {
  return useAlarmList<AlarmEvent>(`/api/v1/alarms/events?limit=${limit}`, refreshMs);
}

export function useAlarm(alarmId?: string, refreshMs = 5000) {
  const [state, setState] = useState<AlarmItemState<Alarm>>({ state: "loading" });

  const load = useCallback(() => {
    if (!alarmId) {
      setState({ state: "degraded" });
      return;
    }
    apiGet<Alarm>(`/api/v1/alarms/${encodeURIComponent(alarmId)}`)
      .then((response) =>
        setState({
          data: response.data,
          state: response.meta.degraded ? "degraded" : "connected",
          updatedAt: response.meta.timestamp,
        }),
      )
      .catch(() => setState((current) => ({ ...current, state: "degraded" })));
  }, [alarmId]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, refreshMs);
    window.addEventListener(ALARM_INVALIDATED_EVENT, load);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(ALARM_INVALIDATED_EVENT, load);
    };
  }, [load, refreshMs]);

  return state;
}

export function useAcknowledgeAlarm() {
  const [pendingAlarmId, setPendingAlarmId] = useState<string>();
  const [error, setError] = useState<string>();

  const acknowledge = useCallback(async (alarmId: string, note: string) => {
    setPendingAlarmId(alarmId);
    setError(undefined);
    try {
      const response = await apiPost<{ alarm: Alarm }>(
        `/api/v1/alarms/${encodeURIComponent(alarmId)}/acknowledge`,
        { actor: "demo-operator", note },
      );
      invalidateAlarmData();
      return response.data.alarm;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to acknowledge alarm";
      setError(message);
      throw err;
    } finally {
      setPendingAlarmId(undefined);
    }
  }, []);

  return useMemo(
    () => ({ acknowledge, pendingAlarmId, error }),
    [acknowledge, error, pendingAlarmId],
  );
}

function useAlarmList<T>(path: string, refreshMs: number): AlarmListState<T> {
  const [state, setState] = useState<AlarmListState<T>>({ data: [], state: "loading" });

  const load = useCallback(() => {
    apiGet<T[]>(path)
      .then((response) =>
        setState({
          data: response.data,
          state: response.meta.degraded ? "degraded" : "connected",
          updatedAt: response.meta.timestamp,
        }),
      )
      .catch(() => setState((current) => ({ ...current, state: "degraded" })));
  }, [path]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, refreshMs);
    window.addEventListener(ALARM_INVALIDATED_EVENT, load);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(ALARM_INVALIDATED_EVENT, load);
    };
  }, [load, refreshMs]);

  return state;
}
