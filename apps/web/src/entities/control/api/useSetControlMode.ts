import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ModeChangeRequest } from "@/entities/control/model/types";
import { setControlMode } from "@/entities/control/api/controlApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useSetControlMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ModeChangeRequest) => setControlMode(request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.control.status }),
        queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.latest }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.recent }),
        queryClient.invalidateQueries({ queryKey: queryKeys.commands.recent }),
      ]);
    },
  });
}
