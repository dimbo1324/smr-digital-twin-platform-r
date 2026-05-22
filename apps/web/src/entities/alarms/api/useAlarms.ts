import { useState } from "react";
import { useAcknowledgeAlarm } from "@/entities/alarms/api/useAcknowledgeAlarm";
import { isRbacDenied } from "@/entities/auth/lib/permissions";
import { useActiveAlarms } from "@/entities/alarms/api/useActiveAlarms";
import { useAlarmHistory } from "@/entities/alarms/api/useAlarmHistory";

export function useAlarms(refreshMs = 2000) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | undefined>();
  const active = useActiveAlarms(refreshMs);
  const history = useAlarmHistory(5000);
  const acknowledgeMutation = useAcknowledgeAlarm();

  const state: "loading" | "connected" | "degraded" =
    active.state === "loading" || history.state === "loading"
      ? "loading"
      : active.state === "degraded" || history.state === "degraded"
        ? "degraded"
        : "connected";

  const acknowledge = (id: string) => {
    setFeedback(undefined);
    return acknowledgeMutation
      .mutateAsync({ id })
      .then((alarm) => {
        setFeedback({ type: "success", message: `Alarm ${alarm.code ?? alarm.id} acknowledged.` });
        return alarm;
      })
      .catch((error: unknown) => {
        const message = isRbacDenied(error)
          ? "Demo RBAC denied alarm acknowledgement for the current role."
          : error instanceof Error
            ? error.message
            : "Failed to acknowledge alarm";
        setFeedback({ type: "error", message });
        throw error;
      });
  };

  return {
    activeAlarms: active.activeAlarms,
    history: history.history,
    state,
    acknowledgingId: acknowledgeMutation.variables?.id,
    feedback,
    refresh: () => {
      active.refresh();
      history.refresh();
    },
    acknowledge,
  };
}
