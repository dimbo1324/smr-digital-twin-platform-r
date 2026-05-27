import { AlarmSummaryCard } from "./cards/AlarmSummaryCard";
import { AuthRbacStatusCard } from "./cards/AuthRbacStatusCard";
import { RecentCommandsCard } from "./cards/RecentCommandsCard";
import { RecentEventsCard } from "./cards/RecentEventsCard";
import { SimulationStatusCard } from "./cards/SimulationStatusCard";
import { SystemBoundaryCard } from "./cards/SystemBoundaryCard";
import { SystemStatusCard } from "./cards/SystemStatusCard";
import { TelemetrySummaryCard } from "./cards/TelemetrySummaryCard";
import type { DashboardLiveOverviewProps } from "./types";

export function DashboardLiveOverview({
  systemStatus,
  telemetry,
  alarms,
  commands,
  events,
}: DashboardLiveOverviewProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-4">
        <SystemStatusCard systemStatus={systemStatus} />
        <SimulationStatusCard systemStatus={systemStatus} telemetry={telemetry} />
        <AlarmSummaryCard alarms={alarms} />
        <RecentCommandsCard commands={commands} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <TelemetrySummaryCard telemetry={telemetry} />
        <RecentEventsCard events={events} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SystemBoundaryCard systemStatus={systemStatus} />
        <AuthRbacStatusCard />
      </section>
    </div>
  );
}
