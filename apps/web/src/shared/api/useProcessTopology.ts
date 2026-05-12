import { useEffect, useMemo, useState } from "react";
import type { ProcessTopology } from "@/entities/process/model/types";
import { apiGet } from "@/shared/api/client";

export interface ProcessTopologyState {
  state: "loading" | "connected" | "degraded";
  topology: ProcessTopology;
}

const fallbackTopology: ProcessTopology = {
  nodes: [],
  edges: [],
  meta: {
    source: "frontend-fallback",
    simulationOnly: true,
    generatedAt: new Date(0).toISOString(),
    simulationConnected: false,
    simulationMode: "OFFLINE",
    simulationHealth: "DEGRADED",
  },
};

export function useProcessTopology(refetchMs = 3000): ProcessTopologyState {
  const [topology, setTopology] = useState<ProcessTopology>(fallbackTopology);
  const [state, setState] = useState<ProcessTopologyState["state"]>("loading");

  useEffect(() => {
    let mounted = true;
    const load = () => {
      apiGet<ProcessTopology>("/api/v1/process/topology")
        .then((response) => {
          if (!mounted) {
            return;
          }
          setTopology(response.data);
          setState(response.meta.degraded ? "degraded" : "connected");
        })
        .catch(() => {
          if (!mounted) {
            return;
          }
          setState("degraded");
          setTopology((current) =>
            current.nodes.length > 0 ? current : fallbackTopology,
          );
        });
    };

    load();
    const interval = window.setInterval(load, refetchMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [refetchMs]);

  return useMemo(() => ({ state, topology }), [state, topology]);
}
