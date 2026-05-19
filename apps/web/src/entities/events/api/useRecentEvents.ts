import { useQuery } from "@tanstack/react-query";
import { getRecentEvents } from "@/entities/events/api/eventsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useRecentEvents(refreshMs = 2500) {
  const query = useQuery({
    queryKey: queryKeys.events.recent,
    queryFn: ({ signal }) => getRecentEvents(signal),
    refetchInterval: refreshMs,
  });

  const events = query.data ?? [];
  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError && events.length === 0
      ? "degraded"
      : "connected";

  return {
    events,
    state,
    refresh: () => void query.refetch(),
  };
}
