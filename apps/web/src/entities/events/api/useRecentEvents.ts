import { useCallback, useEffect, useState } from "react";
import type { EventRecord } from "@/entities/events/model/types";
import { getRecentEvents } from "@/entities/events/api/eventsApi";

export function useRecentEvents(refreshMs = 2500) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [state, setState] = useState<"loading" | "connected" | "degraded">("loading");

  const refresh = useCallback(() => {
    getRecentEvents()
      .then((nextEvents) => {
        setEvents(nextEvents);
        setState("connected");
      })
      .catch(() => setState("degraded"));
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(interval);
  }, [refresh, refreshMs]);

  return { events, state, refresh };
}
