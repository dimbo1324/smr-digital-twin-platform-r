import { useQuery } from "@tanstack/react-query";
import { getScenarios } from "@/entities/scenarios/api/scenariosApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useScenarios() {
  const query = useQuery({
    queryKey: queryKeys.scenarios.all,
    queryFn: ({ signal }) => getScenarios(signal),
    staleTime: 30_000,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError
      ? "degraded"
      : "connected";

  return {
    scenarios: query.data ?? [],
    state,
    refresh: () => void query.refetch(),
  };
}
