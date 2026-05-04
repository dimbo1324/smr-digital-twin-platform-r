import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SettingsPage() {
  return (
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
        description="Disabled placeholders for future simulation runtime controls."
        rows={[
          ["Simulation tick rate", "1 Hz"],
          ["Telemetry refresh interval", "1000 ms"],
          ["Scenario execution", "Disabled"],
          ["Command arbitration", "USER / PID / SCENARIO / SAFETY_LIMITER"],
        ]}
      />

      <SettingsPanel
        title="UI Settings"
        description="Display preferences for the engineering cockpit."
        rows={[
          ["Theme", "Dark industrial"],
          ["Unit system", "SI"],
          ["Density", "Comfortable"],
          ["Accessibility mode", "Default"],
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Data Source Settings</CardTitle>
          <CardDescription>
            API, MQTT, and historian sources will be enabled in later milestones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Mock", "API", "MQTT"].map((source) => (
            <label
              key={source}
              className="flex cursor-not-allowed items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <span className="text-sm text-zinc-200">{source}</span>
              <input
                type="radio"
                checked={source === "Mock"}
                readOnly
                disabled
                className="h-4 w-4"
              />
            </label>
          ))}
          <Badge variant="warning">Data source switching disabled in shell</Badge>
        </CardContent>
      </Card>
    </section>
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
          <div
            key={label}
            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-zinc-100">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
