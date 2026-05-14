import { useQuery } from "@tanstack/react-query";
import type { Equipment } from "@/entities/equipment/model/types";
import { getAssets } from "@/entities/equipment/api/assetsApi";
import { queryKeys } from "@/shared/api/query-keys";

export interface AssetsState {
  state: "loading" | "connected" | "degraded";
  assets: Equipment[];
  source?: string;
  degraded?: boolean;
}

export function useAssets(refreshMs = 60_000): AssetsState & { refresh: () => void } {
  const query = useQuery({
    queryKey: queryKeys.assets.all,
    queryFn: ({ signal }) => getAssets(signal),
    refetchInterval: refreshMs,
    staleTime: 30_000,
  });

  const state: AssetsState["state"] = query.isLoading
    ? "loading"
    : query.isError || query.data?.meta.degraded
      ? "degraded"
      : "connected";

  return {
    state,
    assets: query.data?.assets ?? [],
    source: query.data?.meta.source,
    degraded: query.data?.meta.degraded,
    refresh: () => void query.refetch(),
  };
}
