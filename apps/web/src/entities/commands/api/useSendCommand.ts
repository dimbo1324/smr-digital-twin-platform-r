import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CommandRequest } from "@/entities/commands/model/types";
import { sendCommand } from "@/entities/commands/api/commandsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useSendCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CommandRequest) => sendCommand(request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.latest }),
        queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.histories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.commands.recent }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.recent }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alarms.active }),
        queryClient.invalidateQueries({ queryKey: queryKeys.alarms.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.control.status }),
      ]);
    },
  });
}
