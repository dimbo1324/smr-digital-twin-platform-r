import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AlarmAcknowledgeRequest } from "@/entities/alarms/model/types";
import { acknowledgeAlarm } from "@/entities/alarms/api/alarmsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useAcknowledgeAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: AlarmAcknowledgeRequest }) =>
      acknowledgeAlarm(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.alarms.active }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alarms.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.recent }),
      ]);
    },
  });
}
