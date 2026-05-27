import type { Alarm } from "@/entities/alarms/model/types";
import type { CommandRecord } from "@/entities/commands/model/types";
import type { EventRecord } from "@/entities/events/model/types";
import type { LiveTelemetryState } from "@/shared/api/useSimulationTelemetry";
import type { SystemStatusState } from "@/shared/api/useSystemStatus";

export type DashboardRemoteState = "loading" | "connected" | "degraded";

export interface DashboardLiveOverviewProps {
  systemStatus: SystemStatusState;
  telemetry: LiveTelemetryState;
  alarms: {
    activeAlarms: Alarm[];
    history: Alarm[];
    state: DashboardRemoteState;
  };
  commands: {
    commands: CommandRecord[];
    state: DashboardRemoteState;
  };
  events: {
    events: EventRecord[];
    state: DashboardRemoteState;
  };
}
