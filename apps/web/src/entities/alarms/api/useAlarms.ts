import { useCallback, useEffect, useState } from "react";
import type { Alarm } from "@/entities/alarms/model/types";
import { acknowledgeAlarm, getActiveAlarms, getAlarmHistory } from "@/entities/alarms/api/alarmsApi";

export function useAlarms(refreshMs = 2000) {
  const [activeAlarms, setActiveAlarms] = useState<Alarm[]>([]);
  const [history, setHistory] = useState<Alarm[]>([]);
  const [state, setState] = useState<"loading" | "connected" | "degraded">("loading");
  const [acknowledgingId, setAcknowledgingId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | undefined>();

  const refresh = useCallback(() => {
    Promise.all([getActiveAlarms(), getAlarmHistory()])
      .then(([nextActive, nextHistory]) => {
        setActiveAlarms(nextActive);
        setHistory(nextHistory);
        setState("connected");
      })
      .catch(() => setState("degraded"));
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(interval);
  }, [refresh, refreshMs]);

  const acknowledge = useCallback(
    (id: string) => {
      setAcknowledgingId(id);
      setFeedback(undefined);
      return acknowledgeAlarm(id)
        .then((alarm) => {
          setFeedback({ type: "success", message: `Alarm ${alarm.code ?? alarm.id} acknowledged.` });
          refresh();
          return alarm;
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Failed to acknowledge alarm";
          setFeedback({ type: "error", message });
          throw error;
        })
        .finally(() => setAcknowledgingId(undefined));
    },
    [refresh],
  );

  return { activeAlarms, history, state, acknowledgingId, feedback, refresh, acknowledge };
}
