import { useTheme } from "@/app/providers/theme/themeContext";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageShell } from "@/shared/ui/page-shell";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function SettingsPage() {
  const { theme } = useTheme();

  return (
    <PageShell>
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
              API, MQTT, and historian sources will be enabled in later milestones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Mock", "API", "MQTT"].map((source) => (
              <label
                key={source}
                className="flex cursor-not-allowed items-center justify-between rounded-2xl border border-border/70 bg-surface-elevated/60 p-4"
              >
                <span className="text-sm text-foreground">{source}</span>
                <input
                  type="radio"
                  checked={source === "Mock"}
                  readOnly
                  disabled
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
            <Badge variant="warning">Data source switching disabled in shell</Badge>
          </CardContent>
        </Card>
      </section>
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
