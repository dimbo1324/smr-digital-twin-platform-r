import { useQuery } from "@tanstack/react-query";
import { getPidStatus } from "@/entities/pid/api/pidApi";
import { queryKeys } from "@/shared/api/query-keys";

export function usePidStatus(refreshMs = 1000) {
  const query = useQuery({
    queryKey: queryKeys.pid.status,
    queryFn: ({ signal }) => getPidStatus(signal),
    refetchInterval: refreshMs,
  });

  return {
    pidStatus: query.data,
    state: query.isLoading ? "loading" : query.isError ? "degraded" : "connected",
    error: query.error,
    isFetching: query.isFetching,
  } as const;
}
