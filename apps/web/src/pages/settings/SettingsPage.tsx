import { useTheme } from "@/app/providers/theme/themeContext";
import { useHistorianStatus } from "@/entities/historian/api/useHistorianStatus";
import { useMqttStatus } from "@/entities/mqtt/api/useMqttStatus";
import { useSimulationScenarios } from "@/shared/api/useSimulationTelemetry";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function SettingsPage() {
  const { theme } = useTheme();
  const simulation = useSimulationScenarios();
  const historian = useHistorianStatus();
  const mqtt = useMqttStatus();

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
            ["Simulation tick rate", simulation.status ? `${simulation.status.tickMs} ms` : "1000 ms"],
            ["Connection", simulation.state === "connected" ? "Connected" : "In-memory fallback / unavailable"],
            ["Active scenario", simulation.status?.activeScenario ?? "normal"],
            ["Boundary", "Simulation-only, no live control"],
          ]}
        />

        <SettingsPanel
          title="Historian Settings"
          description="Persistence status for synthetic simulation telemetry, commands, events, and alarms."
          rows={[
            ["Status", historian.status?.status ?? "checking"],
            ["Mode", historian.status?.mode ?? "in_memory"],
            ["Storage", historian.status?.database ?? "in-memory"],
            ["Fallback", historian.status?.fallbackActive ? "Active" : "Not active"],
          ]}
        />

        <SettingsPanel
          title="MQTT Bridge Settings"
          description="Publish-only MQTT status for synthetic simulation payloads."
          rows={[
            ["Status", mqtt.status?.status ?? "checking"],
            ["Mode", "Publish-only"],
            ["Topic prefix", mqtt.status?.topicPrefix ?? "smr/site-001/unit-001"],
            ["Command ingestion", "Not implemented"],
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>UI Settings</CardTitle>
            <CardDescription>
              Display preferences for the engineering cockpit.
            </CardDescription>
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
            <Badge variant={historian.status?.status === "connected" ? "success" : "warning"}>
              Historian: {historian.status?.status ?? "checking"} / MQTT: {mqtt.status?.status ?? "checking"}
            </Badge>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Simulation Scenario Controls</CardTitle>
          <CardDescription>
            Starts synthetic demo scenarios through the backend API. These controls never
            target real equipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {simulation.scenarios.map((scenario) => (
              <Button
                key={scenario.name}
                variant="outline"
                onClick={() => void simulation.actions.start(scenario.name)}
                className="justify-start"
              >
                {scenario.title}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void simulation.actions.stop()}>
              Stop scenario
            </Button>
            <Button variant="outline" onClick={() => void simulation.actions.reset()}>
              Reset simulation
            </Button>
            <Badge variant="warning">Simulation-only controls</Badge>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function SettingsPanel({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<[string, string]>;
}) {
  return (
    <Card>
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
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-surface-elevated/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
