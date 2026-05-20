import { useQuery } from "@tanstack/react-query";
import { getHistorianStatus } from "@/entities/historian/api/historianApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useHistorianStatus(refreshMs = 10_000) {
  const query = useQuery({
    queryKey: queryKeys.historian.status,
    queryFn: ({ signal }) => getHistorianStatus(signal),
    refetchInterval: refreshMs,
    staleTime: 5_000,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError || query.data?.fallbackActive
      ? "degraded"
      : "connected";

  return {
    status: query.data,
    state,
    refresh: () => void query.refetch(),
  };
}
