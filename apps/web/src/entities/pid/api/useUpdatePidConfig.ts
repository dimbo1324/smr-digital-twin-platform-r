import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePidConfig } from "@/entities/pid/api/pidApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useUpdatePidConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePidConfig,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pid.status }),
        queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.latest }),
        queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.histories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.recent }),
        queryClient.invalidateQueries({ queryKey: queryKeys.control.status }),
      ]);
    },
  });
}
