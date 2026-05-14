import { useQuery } from "@tanstack/react-query";
import { getRecentCommands } from "@/entities/commands/api/commandsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useRecentCommands(refreshMs = 2500) {
  const query = useQuery({
    queryKey: queryKeys.commands.recent,
    queryFn: ({ signal }) => getRecentCommands(signal),
    refetchInterval: refreshMs,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError
      ? "degraded"
      : "connected";

  return {
    commands: query.data ?? [],
    state,
    refresh: () => void query.refetch(),
  };
}
