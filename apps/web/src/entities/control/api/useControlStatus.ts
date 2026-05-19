import { useQuery } from "@tanstack/react-query";
import { getControlStatus } from "@/entities/control/api/controlApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useControlStatus(refreshMs = 3000) {
  const query = useQuery({
    queryKey: queryKeys.control.status,
    queryFn: ({ signal }) => getControlStatus(signal),
    refetchInterval: refreshMs,
  });

  return {
    controlStatus: query.data,
    state: query.isLoading ? "loading" : query.isError ? "degraded" : "connected",
    error: query.error,
    refresh: () => void query.refetch(),
  } as const;
}
