import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetSimulation, startScenario, stopScenario } from "@/entities/scenarios/api/scenariosApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useScenarioActions() {
  const queryClient = useQueryClient();

  const invalidateScenarioSideEffects = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.latest }),
      queryClient.invalidateQueries({ queryKey: queryKeys.telemetry.histories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alarms.active }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alarms.history }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.recent }),
      queryClient.invalidateQueries({ queryKey: queryKeys.commands.recent }),
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all }),
    ]);
  };

  const start = useMutation({
    mutationFn: startScenario,
    onSuccess: invalidateScenarioSideEffects,
  });
  const stop = useMutation({
    mutationFn: stopScenario,
    onSuccess: invalidateScenarioSideEffects,
  });
  const reset = useMutation({
    mutationFn: resetSimulation,
    onSuccess: invalidateScenarioSideEffects,
  });

  return {
    status: start.data ?? stop.data ?? reset.data,
    actions: {
      start: start.mutateAsync,
      stop: stop.mutateAsync,
      reset: reset.mutateAsync,
    },
    isPending: start.isPending || stop.isPending || reset.isPending,
  };
}
