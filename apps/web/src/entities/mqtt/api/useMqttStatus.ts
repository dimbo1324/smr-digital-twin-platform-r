import { useQuery } from "@tanstack/react-query";
import { getMqttStatus } from "@/entities/mqtt/api/mqttApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useMqttStatus(refreshMs = 10_000) {
  const query = useQuery({
    queryKey: queryKeys.mqtt.status,
    queryFn: ({ signal }) => getMqttStatus(signal),
    refetchInterval: refreshMs,
    staleTime: 5_000,
  });

  const state: "loading" | "connected" | "degraded" = query.isLoading
    ? "loading"
    : query.isError || query.data?.status === "degraded" || query.data?.status === "unavailable"
      ? "degraded"
      : "connected";

  return {
    status: query.data,
    state,
    refresh: () => void query.refetch(),
  };
}
