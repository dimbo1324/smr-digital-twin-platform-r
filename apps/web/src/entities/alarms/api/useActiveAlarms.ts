import { useQuery } from "@tanstack/react-query";
import { getActiveAlarms } from "@/entities/alarms/api/alarmsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useActiveAlarms(refreshMs = 2000) {
  const query = useQuery({
    queryKey: queryKeys.alarms.active,
    queryFn: ({ signal }) => getActiveAlarms(signal),
    refetchInterval: refreshMs,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError
      ? "degraded"
      : "connected";

  return {
    activeAlarms: query.data ?? [],
    state,
    refresh: () => void query.refetch(),
  };
}
