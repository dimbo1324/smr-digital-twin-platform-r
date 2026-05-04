import { useEffect, useState } from "react";
import type { SystemStatus } from "@/entities/system/model/types";
import { apiGet } from "@/shared/api/client";

export type SystemStatusState =
  | { state: "checking"; status?: undefined }
  | { state: "connected"; status: SystemStatus }
  | { state: "offline"; status?: undefined };

export function useSystemStatus(): SystemStatusState {
  const [systemStatus, setSystemStatus] = useState<SystemStatusState>({
    state: "checking",
  });

  useEffect(() => {
    const controller = new AbortController();

    apiGet<SystemStatus>("/api/v1/system/status", controller.signal)
      .then((response) => {
        setSystemStatus({
          state: "connected",
          status: response.data,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSystemStatus({ state: "offline" });
      });

    return () => controller.abort();
  }, []);

  return systemStatus;
}
