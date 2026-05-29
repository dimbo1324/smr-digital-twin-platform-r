import { useTheme } from "@/app/providers/theme/themeContext";
import { useAuthSession } from "@/entities/auth/api/useAuthSession";
import { hasPermission, permissions, roleDeniedReason } from "@/entities/auth/lib/permissions";
import { useHistorianStatus } from "@/entities/historian/api/useHistorianStatus";
import { useMqttStatus } from "@/entities/mqtt/api/useMqttStatus";
import { useSimulationScenarios } from "@/shared/api/useSimulationTelemetry";
import { displayLabel } from "@/shared/lib/display-labels";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { IntegrationStatusCard } from "@/shared/ui/integration-status-card";
import { PermissionDeniedHint, SimulationOnlyNotice } from "@/shared/ui/industrial-states";
import { PageShell } from "@/shared/ui/page-shell";
import { StatusBadge } from "@/shared/ui/status-badge";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function SettingsPage() {
  const { theme } = useTheme();
  const simulation = useSimulationScenarios();
  const historian = useHistorianStatus();
  const mqtt = useMqttStatus();
  const auth = useAuthSession();
  const canRunScenario = hasPermission(auth.session, permissions.runScenario);
  const scenarioDeniedReason = roleDeniedReason(auth.session, "run simulation scenarios");

  return (
    <PageShell data-testid="settings-page">
      <section className="grid gap-6 xl:grid-cols-2">
        <SettingsPanel
          title="Project Settings"
          description="Portfolio project metadata for the MVP shell."
          rows={[
            ["Project", "SMR Twin Platform"],
            ["Site", "site-001"],
            ["Unit", "unit-001"],
            ["Mode", "Simulation only"],
          ]}
        />

        <SettingsPanel
          title="Simulation Settings"
          description="Simulation-only runtime controls for synthetic demo scenarios."
          rows={[
            [
              "Simulation tick rate",
              simulation.status ? `${simulation.status.tickMs} ms` : "1000 ms",
            ],
            [
              "Connection",
              simulation.state === "connected" ? "Connected" : "In-memory fallback / unavailable",
            ],
            ["Active scenario", simulation.status?.activeScenario ?? "normal"],
            ["Boundary", "Simulation-only, no live control"],
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Local demo connectivity for historian persistence, MQTT publish-only transport,
              reports, and observability.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <IntegrationStatusCard
              title="Historian"
              description="Status, mode, and storage for synthetic telemetry, commands, events, and alarms persistence."
              status={historian.status?.status ?? "checking"}
              source={
                historian.status?.fallbackActive
                  ? "in_memory_fallback"
                  : (historian.status?.mode ?? "persistent_historian")
              }
              tone={
                historian.status?.status === "connected"
                  ? "connected"
                  : historian.status?.fallbackActive
                    ? "fallback"
                    : "degraded"
              }
              testId="settings-historian-status"
            />
            <IntegrationStatusCard
              title="MQTT bridge"
              description="Publish-only synthetic payload bridge. Command ingestion: Not implemented."
              status={mqtt.status?.status ?? "checking"}
              source="MQTT publish-only"
              tone={
                mqtt.status?.status === "connected"
                  ? "connected"
                  : mqtt.status?.status === "disabled"
                    ? "disabled"
                    : "degraded"
              }
              testId="settings-mqtt-status"
            />
            <IntegrationStatusCard
              title="Reports"
              description="JSON/CSV simulation summaries. Not regulatory reporting."
              status="Implemented"
              source="simulation_only"
              tone="simulation"
            />
            <IntegrationStatusCard
              title="Observability"
              description="Local/demo Prometheus and Grafana baseline."
              status="Local demo"
              source="local observability"
              tone="neutral"
            />
          </CardContent>
        </Card>

        <Card data-testid="settings-capability-matrix">
          <CardHeader>
            <CardTitle>UI Settings</CardTitle>
            <CardDescription>Display preferences for the engineering cockpit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated/60 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Persisted in localStorage and initialized from system preference.
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <Badge variant="mock" className="mt-4">
                Current: {theme}
              </Badge>
            </div>
            <SettingRow label="Unit system" value="SI" />
            <SettingRow label="Density" value="Comfortable" />
            <SettingRow label="Accessibility mode" value="Default" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Source Settings</CardTitle>
            <CardDescription>
              API, historian, and publish-only MQTT integration status for the local simulator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["In-memory fallback", "Backend API", "MQTT publish-only"].map((source) => (
              <label
                key={source}
                className="flex cursor-not-allowed items-center justify-between rounded-2xl border border-border/70 bg-surface-elevated/60 p-4"
              >
                <span className="text-sm text-foreground">{source}</span>
                <input
                  type="radio"
                  checked={
                    simulation.state === "connected"
                      ? source === "Backend API"
                      : source === "In-memory fallback"
                  }
                  readOnly
                  disabled
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
            <StatusBadge
              tone={
                historian.status?.status === "connected" && mqtt.status?.status === "connected"
                  ? "connected"
                  : "degraded"
              }
              value={`Historian: ${historian.status?.status ?? "checking"} / MQTT: ${mqtt.status?.status ?? "checking"}`}
            />
          </CardContent>
        </Card>
      </section>

      <Card data-testid="settings-safety-boundary">
        <CardHeader>
          <CardTitle>Simulation Scenario Controls</CardTitle>
          <CardDescription>
            Starts synthetic demo scenarios through the backend API. These controls never target
            real equipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimulationOnlyNotice className="mb-4" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {simulation.scenarios.map((scenario) => (
              <Button
                key={scenario.name}
                variant="outline"
                onClick={() => void simulation.actions.start(scenario.name)}
                disabled={!canRunScenario}
                className="justify-start"
              >
                {scenario.title}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void simulation.actions.stop()}
              disabled={!canRunScenario}
            >
              Stop scenario
            </Button>
            <Button
              variant="outline"
              onClick={() => void simulation.actions.reset()}
              disabled={!canRunScenario}
            >
              Reset simulation
            </Button>
            <Badge variant="warning">Simulation-only controls</Badge>
          </div>
          {!canRunScenario ? (
            <PermissionDeniedHint className="mt-3">{scenarioDeniedReason}</PermissionDeniedHint>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function SettingsPanel({
  title,
  description,
  rows,
  testId,
}: {
  title: string;
  description: string;
  rows: Array<[string, string]>;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value]) => (
          <SettingRow key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium text-foreground sm:text-right">
        {displayLabel(value)}
      </span>
    </div>
  );
}
