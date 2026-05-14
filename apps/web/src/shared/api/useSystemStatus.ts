import { useQuery } from "@tanstack/react-query";
import type { SystemStatus } from "@/entities/system/model/types";
import { apiGet } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";

export type SystemStatusState =
  | { state: "checking"; status?: undefined }
  | { state: "connected"; status: SystemStatus }
  | { state: "offline"; status?: undefined };

export function useSystemStatus(): SystemStatusState {
  const query = useQuery({
    queryKey: queryKeys.system.status,
    queryFn: ({ signal }) =>
      apiGet<SystemStatus>("/api/v1/system/status", {
        signal,
        responseSchema: "SystemStatus",
      }),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  if (query.data) {
    return { state: "connected", status: query.data.data };
  }

  if (query.isLoading) {
    return { state: "checking" };
  }

  return { state: "offline" };
}
