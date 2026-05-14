import { useQueryClient } from "@tanstack/react-query";
import { useRecentCommands } from "@/entities/commands/api/useRecentCommands";
import { useRecentEvents } from "@/entities/events/api/useRecentEvents";
import { queryKeys } from "@/shared/api/query-keys";

export function useCommandHistory(refreshMs = 2500) {
  const queryClient = useQueryClient();
  const commands = useRecentCommands(refreshMs);
  const events = useRecentEvents(refreshMs);

  const state: "loading" | "connected" | "degraded" =
    commands.state === "loading" || events.state === "loading"
      ? "loading"
      : commands.state === "degraded" || events.state === "degraded"
        ? "degraded"
        : "connected";

  return {
    commands: commands.commands,
    events: events.events,
    state,
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.commands.recent });
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.recent });
    },
  };
}
