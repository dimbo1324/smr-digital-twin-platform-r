import { useQuery } from "@tanstack/react-query";
import { getAlarmHistory } from "@/entities/alarms/api/alarmsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useAlarmHistory(refreshMs = 5000) {
  const query = useQuery({
    queryKey: queryKeys.alarms.history,
    queryFn: ({ signal }) => getAlarmHistory(signal),
    refetchInterval: refreshMs,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError
      ? "degraded"
      : "connected";

  return {
    history: query.data ?? [],
    state,
    refresh: () => void query.refetch(),
  };
}
