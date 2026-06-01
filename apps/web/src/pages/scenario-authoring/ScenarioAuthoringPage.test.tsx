import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioAuthoringPage } from "@/pages/scenario-authoring/ScenarioAuthoringPage";
import { renderWithProviders } from "@/test/render";

const scenarioMocks = vi.hoisted(() => ({
  useScenarios: vi.fn(),
}));

vi.mock("@/entities/scenarios/api/useScenarios", () => ({
  useScenarios: scenarioMocks.useScenarios,
}));

describe("ScenarioAuthoringPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders a simulation-only YAML draft workspace", () => {
    scenarioMocks.useScenarios.mockReturnValue({
      scenarios: [{ name: "high_temperature", title: "High Temperature" }],
      state: "connected",
      refresh: vi.fn(),
    });

    renderWithProviders(<ScenarioAuthoringPage />);

    expect(screen.getByTestId("scenario-authoring-page")).toBeInTheDocument();
    expect(screen.getByText(/Local draft\/export only/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/stores YAML drafts locally in this browser only/i).length,
    ).toBeGreaterThan(0);
    expect(yamlValue()).toContain("id: custom_high_temperature");
    expect(screen.getByText(/do not mutate the embedded runtime registry/i)).toBeInTheDocument();
  });

  it("validates required fields before YAML export", async () => {
    const user = userEvent.setup();
    scenarioMocks.useScenarios.mockReturnValue({
      scenarios: [],
      state: "connected",
      refresh: vi.fn(),
    });

    renderWithProviders(<ScenarioAuthoringPage />);

    await user.clear(screen.getByTestId("scenario-authoring-id"));

    expect(screen.getByText(/Scenario id is required/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy YAML/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Download YAML/i })).toBeDisabled();
  });

  it("updates YAML when a template and fields change", async () => {
    const user = userEvent.setup();
    scenarioMocks.useScenarios.mockReturnValue({
      scenarios: [],
      state: "connected",
      refresh: vi.fn(),
    });

    renderWithProviders(<ScenarioAuthoringPage />);

    await user.click(screen.getByRole("button", { name: /Sensor drift/i }));
    await user.clear(screen.getByTestId("scenario-authoring-name"));
    await user.type(screen.getByTestId("scenario-authoring-name"), "Portfolio Drift Demo");

    expect(yamlValue()).toContain("name: Portfolio Drift Demo");
    expect(yamlValue()).toContain("behavior: sensor_drift");
  });

  it("saves loads renames duplicates and deletes local drafts", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "prompt").mockReturnValue("Renamed Workspace Draft");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    scenarioMocks.useScenarios.mockReturnValue({
      scenarios: [],
      state: "connected",
      refresh: vi.fn(),
    });

    renderWithProviders(<ScenarioAuthoringPage />);

    await user.click(screen.getByRole("button", { name: /Sensor drift/i }));
    await user.clear(screen.getByTestId("scenario-authoring-id"));
    await user.type(screen.getByTestId("scenario-authoring-id"), "workspace_sensor_drift");
    await user.click(screen.getByRole("button", { name: /^Save Draft$/i }));

    expect(
      within(screen.getByTestId("scenario-workspace-list")).getByText(/Custom Sensor Drift/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rename/i }));
    expect(
      within(screen.getByTestId("scenario-workspace-list")).getByText(/Renamed Workspace Draft/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Duplicate/i }));
    expect(screen.getAllByTestId("scenario-workspace-item")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: /Delete/i })[0]);
    expect(screen.getAllByTestId("scenario-workspace-item")).toHaveLength(1);

    await user.click(
      within(screen.getByTestId("scenario-workspace-list")).getByRole("button", {
        name: /^Load$/i,
      }),
    );
    expect(yamlValue()).toContain("workspace_sensor_drift");
  });

  it("imports YAML into the local workspace and keeps export available", async () => {
    const user = userEvent.setup();
    scenarioMocks.useScenarios.mockReturnValue({
      scenarios: [],
      state: "connected",
      refresh: vi.fn(),
    });

    renderWithProviders(<ScenarioAuthoringPage />);

    await user.type(
      screen.getByTestId("scenario-workspace-import-yaml"),
      [
        "id: imported_workspace_demo",
        "name: Imported Workspace Demo",
        "description: Simulation-only imported demo.",
        "category: demo",
        "severity: info",
        "duration: 5m",
        "tags:",
        "  - demo",
        "reportTags:",
        "  - TT-101",
        "safetyNote: Simulation-only local draft. No real plant control.",
        "enabled: true",
        "version: 1",
        "effects:",
        "  behavior: nominal",
        "  mode: NORMAL",
      ].join("\n"),
    );
    await user.click(screen.getByTestId("scenario-workspace-import"));

    expect(
      within(screen.getByTestId("scenario-workspace-list")).getByText(/Imported Workspace Demo/i),
    ).toBeInTheDocument();
    expect(yamlValue()).toContain("id: imported_workspace_demo");
    expect(screen.getByRole("button", { name: /Download YAML/i })).toBeEnabled();
  });
});

function yamlValue() {
  return (screen.getByLabelText(/Generated scenario YAML/i) as HTMLTextAreaElement).value;
}
