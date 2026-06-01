import { useMemo, useState } from "react";
import { Clipboard, Download, FileCode2, RotateCcw, ShieldCheck } from "lucide-react";
import { useScenarios } from "@/entities/scenarios/api/useScenarios";
import {
  listInputValue,
  parseListInput,
  scenarioDraftToYaml,
  scenarioTemplates,
  scenarioYamlFilename,
  validateScenarioDraft,
  type ScenarioBehavior,
  type ScenarioDraft,
  type ScenarioSeverity,
} from "@/features/scenario-authoring/lib/scenarioDraft";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { CommandButton } from "@/shared/ui/command-button";
import { EmptyState, InlineInfo, SimulationOnlyNotice } from "@/shared/ui/industrial-states";
import { KpiCard } from "@/shared/ui/kpi-card";
import { PageShell } from "@/shared/ui/page-shell";
import { PanelShell } from "@/shared/ui/panel-shell";
import { SourceBadge } from "@/shared/ui/source-badge";
import { StatusBadge } from "@/shared/ui/status-badge";
import type { StatusTone } from "@/shared/ui/status-badge";

const numericEffectFields = [
  ["targetPowerPct", "Target power (%)"],
  ["primaryTemperatureC", "Primary temp (C)"],
  ["primaryPressureMPa", "Primary pressure (MPa)"],
  ["flowPct", "Flow (%)"],
  ["levelPct", "Level (%)"],
  ["amplitudePct", "Load amplitude (%)"],
  ["periodTicks", "Period (ticks)"],
] as const;

export function ScenarioAuthoringPage() {
  const scenarios = useScenarios();
  const [templateId, setTemplateId] = useState("high_temperature");
  const [draft, setDraft] = useState<ScenarioDraft>(() => cloneDraft("high_temperature"));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const existingIds = useMemo(
    () => scenarios.scenarios.map((scenario) => scenario.name),
    [scenarios.scenarios],
  );
  const validation = useMemo(() => validateScenarioDraft(draft, existingIds), [draft, existingIds]);
  const yaml = useMemo(() => scenarioDraftToYaml(draft), [draft]);

  const selectTemplate = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId);
    setDraft(cloneDraft(nextTemplateId));
    setCopyState("idle");
  };

  const updateDraft = <Key extends keyof ScenarioDraft>(key: Key, value: ScenarioDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateEffect = (key: keyof ScenarioDraft["effects"], value: string) => {
    setDraft((current) => ({
      ...current,
      effects: {
        ...current.effects,
        [key]:
          key === "behavior" || key === "mode"
            ? value
            : value.trim() === ""
              ? undefined
              : Number(value),
      },
    }));
  };

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const downloadYaml = () => {
    const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = scenarioYamlFilename(draft.id);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell data-testid="scenario-authoring-page">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <PanelShell
          title="Scenario Authoring"
          subtitle="Create, preview, validate, and export simulation-only YAML drafts for synthetic demo scenarios."
          eyebrow="Draft workspace"
          icon={FileCode2}
          status={
            <StatusBadge
              tone={validation.valid ? "healthy" : "warning"}
              value={validation.valid ? "Valid draft" : "Needs review"}
            />
          }
          actions={<SourceBadge source="simulation_only" />}
          testId="scenario-authoring-editor"
        >
          <SimulationOnlyNotice className="mb-5" badgeLabel="Draft/export only" />

          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <TemplatePicker selectedId={templateId} onSelect={selectTemplate} />

            <div className="space-y-5">
              <Card className="bg-surface-subtle/50">
                <CardHeader>
                  <CardTitle>Scenario fields</CardTitle>
                  <CardDescription>
                    These values generate a YAML draft. They do not mutate the embedded runtime
                    registry.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Scenario id"
                    value={draft.id}
                    onChange={(value) => updateDraft("id", value)}
                    testId="scenario-authoring-id"
                  />
                  <TextField
                    label="Name"
                    value={draft.name}
                    onChange={(value) => updateDraft("name", value)}
                    testId="scenario-authoring-name"
                  />
                  <TextField
                    label="Category"
                    value={draft.category}
                    onChange={(value) => updateDraft("category", value)}
                  />
                  <TextField
                    label="Duration"
                    value={draft.duration}
                    onChange={(value) => updateDraft("duration", value)}
                    helper="Use values like 30s, 5m, or 1h."
                  />
                  <SelectField
                    label="Severity"
                    value={draft.severity}
                    onChange={(value) => updateDraft("severity", value as ScenarioSeverity)}
                    options={["info", "warning", "critical"]}
                  />
                  <TextField
                    label="Version"
                    type="number"
                    value={String(draft.version)}
                    onChange={(value) => updateDraft("version", Number(value))}
                  />
                  <TextAreaField
                    label="Description"
                    value={draft.description}
                    onChange={(value) => updateDraft("description", value)}
                    className="md:col-span-2"
                  />
                  <TextAreaField
                    label="Safety note"
                    value={draft.safetyNote}
                    onChange={(value) => updateDraft("safetyNote", value)}
                    className="md:col-span-2"
                  />
                  <TextAreaField
                    label="Tags"
                    value={listInputValue(draft.tags)}
                    onChange={(value) => updateDraft("tags", parseListInput(value))}
                    helper="Comma or newline separated."
                  />
                  <TextAreaField
                    label="Expected alarms"
                    value={listInputValue(draft.expectedAlarms)}
                    onChange={(value) => updateDraft("expectedAlarms", parseListInput(value))}
                    helper="Use alarm identifiers when the scenario should exercise alarms."
                  />
                  <TextAreaField
                    label="Report tags"
                    value={listInputValue(draft.reportTags)}
                    onChange={(value) => updateDraft("reportTags", parseListInput(value))}
                    className="md:col-span-2"
                  />
                </CardContent>
              </Card>

              <Card className="bg-surface-subtle/50">
                <CardHeader>
                  <CardTitle>Effects</CardTitle>
                  <CardDescription>
                    Supported keys match the source-controlled YAML scenario registry.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Behavior"
                    value={draft.effects.behavior}
                    onChange={(value) => updateEffect("behavior", value as ScenarioBehavior)}
                    options={["nominal", "startup_ramp", "load_sine", "sensor_drift", "fixed"]}
                  />
                  <TextField
                    label="Mode"
                    value={draft.effects.mode}
                    onChange={(value) => updateEffect("mode", value)}
                  />
                  {numericEffectFields.map(([key, label]) => (
                    <TextField
                      key={key}
                      label={label}
                      type="number"
                      value={draft.effects[key] === undefined ? "" : String(draft.effects[key])}
                      onChange={(value) => updateEffect(key, value)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </PanelShell>

        <aside className="space-y-6">
          <ValidationPanel validation={validation} />
          <PreviewPanel draft={draft} />
          <YamlPanel
            yaml={yaml}
            valid={validation.valid}
            copyState={copyState}
            onCopy={() => void copyYaml()}
            onDownload={downloadYaml}
            onReset={() => selectTemplate(templateId)}
          />
        </aside>
      </section>
    </PageShell>
  );
}

function TemplatePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (templateId: string) => void;
}) {
  return (
    <Card className="h-fit bg-surface-subtle/50">
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <CardDescription>Start from a known synthetic scenario shape.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {scenarioTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "w-full rounded-2xl border p-3 text-left transition hover:border-primary/60 hover:bg-primary/10",
              selectedId === template.id
                ? "border-primary/70 bg-primary/10"
                : "border-border/70 bg-background/40",
            )}
          >
            <span className="block text-sm font-medium text-foreground">{template.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {template.description}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function ValidationPanel({ validation }: { validation: ReturnType<typeof validateScenarioDraft> }) {
  return (
    <PanelShell
      title="Validation"
      subtitle="Local draft checks before copy or download."
      icon={ShieldCheck}
      status={
        <StatusBadge
          tone={validation.valid ? "healthy" : "danger"}
          value={validation.valid ? "Pass" : "Review"}
        />
      }
      testId="scenario-authoring-validation"
    >
      {validation.errors.length ? (
        <div className="space-y-2">
          {validation.errors.map((error) => (
            <ValidationMessage key={error} tone="danger" message={error} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No blocking validation errors"
          message="This draft can be copied or downloaded for developer review."
        />
      )}
      {validation.warnings.length ? (
        <div className="mt-3 space-y-2">
          {validation.warnings.map((warning) => (
            <ValidationMessage key={warning} tone="warning" message={warning} />
          ))}
        </div>
      ) : null}
    </PanelShell>
  );
}

function PreviewPanel({ draft }: { draft: ScenarioDraft }) {
  return (
    <PanelShell
      title="Preview"
      subtitle="Human-readable scenario summary."
      testId="scenario-authoring-preview"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Severity" value={draft.severity} status={severityTone(draft.severity)} />
        <KpiCard label="Duration" value={draft.duration} helperText="Synthetic time window" />
        <KpiCard label="Behavior" value={draft.effects.behavior} />
        <KpiCard label="Mode" value={draft.effects.mode || "NORMAL"} />
      </div>
      <div className="mt-4 rounded-2xl border border-border/70 bg-surface-subtle/60 p-4">
        <p className="text-sm font-medium text-foreground">{draft.name}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{draft.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.tags.map((tag) => (
            <StatusBadge key={tag} tone="neutral" value={tag} />
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

function YamlPanel({
  yaml,
  valid,
  copyState,
  onCopy,
  onDownload,
  onReset,
}: {
  yaml: string;
  valid: boolean;
  copyState: "idle" | "copied" | "failed";
  onCopy: () => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  return (
    <PanelShell
      title="YAML Export"
      subtitle="Downloadable draft for source-controlled review."
      testId="scenario-authoring-yaml"
      actions={
        <div className="flex flex-wrap gap-2">
          <CommandButton size="sm" variant="outline" disabled={!valid} onClick={onCopy}>
            <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" />
            Copy YAML
          </CommandButton>
          <CommandButton size="sm" disabled={!valid} onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download YAML
          </CommandButton>
          <Button size="sm" variant="ghost" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
      }
    >
      <textarea
        value={yaml}
        readOnly
        aria-label="Generated scenario YAML"
        data-testid="scenario-authoring-yaml-output"
        className="min-h-[320px] w-full resize-y rounded-2xl border border-border/70 bg-background/70 p-4 font-mono text-xs leading-5 text-foreground shadow-inner outline-none"
      />
      {copyState === "copied" ? (
        <InlineInfo className="mt-3">YAML copied to clipboard.</InlineInfo>
      ) : copyState === "failed" ? (
        <InlineInfo className="mt-3">
          Clipboard access was unavailable. Select the YAML manually.
        </InlineInfo>
      ) : (
        <InlineInfo className="mt-3">
          Exported YAML is a simulation-only draft. A developer must review and commit it before the
          simulator can load it.
        </InlineInfo>
      )}
    </PanelShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  helper,
  type = "text",
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  type?: "text" | "number";
  testId?: string;
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className="mt-2 w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
      />
      {helper ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{helper}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  helper,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-20 w-full resize-y rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary"
      />
      {helper ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{helper}</span>
      ) : null}
    </label>
  );
}

function ValidationMessage({ tone, message }: { tone: "danger" | "warning"; message: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-sm leading-6",
        tone === "danger"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-warning/30 bg-warning/10 text-warning",
      )}
    >
      {message}
    </div>
  );
}

function severityTone(severity: ScenarioSeverity): StatusTone {
  if (severity === "critical") {
    return "danger";
  }
  if (severity === "warning") {
    return "warning";
  }
  return "neutral";
}

function cloneDraft(templateId: string): ScenarioDraft {
  const template =
    scenarioTemplates.find((candidate) => candidate.id === templateId) ?? scenarioTemplates[0];
  return {
    ...template.draft,
    tags: [...template.draft.tags],
    expectedAlarms: [...template.draft.expectedAlarms],
    reportTags: [...template.draft.reportTags],
    effects: { ...template.draft.effects },
  };
}
