import { useCallback, useEffect, useState } from "react";
import type { CommandRecord, SimulationEvent } from "@/entities/commands/model/types";
import { getRecentCommands, getRecentEvents } from "@/entities/commands/api/commandsApi";

export function useCommandHistory(refreshMs = 2500) {
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [state, setState] = useState<"loading" | "connected" | "degraded">("loading");

  const refresh = useCallback(() => {
    Promise.all([getRecentCommands(), getRecentEvents()])
      .then(([nextCommands, nextEvents]) => {
        setCommands(nextCommands);
        setEvents(nextEvents);
        setState("connected");
      })
      .catch(() => {
        setState("degraded");
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(interval);
  }, [refresh, refreshMs]);

  return { commands, events, state, refresh };
}
