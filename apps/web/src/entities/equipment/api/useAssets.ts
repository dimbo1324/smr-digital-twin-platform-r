import { useCallback, useEffect, useState } from "react";
import type { Equipment } from "@/entities/equipment/model/types";
import { getAssets } from "@/entities/equipment/api/assetsApi";

export interface AssetsState {
  state: "loading" | "connected" | "degraded";
  assets: Equipment[];
  source?: string;
  degraded?: boolean;
}

export function useAssets(refreshMs = 5000): AssetsState & { refresh: () => void } {
  const [state, setState] = useState<AssetsState>({ state: "loading", assets: [] });

  const refresh = useCallback(() => {
    getAssets()
      .then((result) => {
        setState({
          state: result.meta.degraded ? "degraded" : "connected",
          assets: result.assets,
          source: result.meta.source,
          degraded: result.meta.degraded,
        });
      })
      .catch(() => {
        setState((current) => ({ ...current, state: "degraded" }));
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(interval);
  }, [refresh, refreshMs]);

  return { ...state, refresh };
}
