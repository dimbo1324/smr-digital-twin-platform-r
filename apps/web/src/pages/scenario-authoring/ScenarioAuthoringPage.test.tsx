import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScenarioAuthoringPage } from "@/pages/scenario-authoring/ScenarioAuthoringPage";
import { renderWithProviders } from "@/test/render";

const scenarioMocks = vi.hoisted(() => ({
  useScenarios: vi.fn(),
}));

vi.mock("@/entities/scenarios/api/useScenarios", () => ({
  useScenarios: scenarioMocks.useScenarios,
}));

describe("ScenarioAuthoringPage", () => {
  it("renders a simulation-only YAML draft workspace", () => {
    scenarioMocks.useScenarios.mockReturnValue({
      scenarios: [{ name: "high_temperature", title: "High Temperature" }],
      state: "connected",
      refresh: vi.fn(),
    });

    renderWithProviders(<ScenarioAuthoringPage />);

    expect(screen.getByTestId("scenario-authoring-page")).toBeInTheDocument();
    expect(screen.getByText(/Draft\/export only/i)).toBeInTheDocument();
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
});

function yamlValue() {
  return (screen.getByLabelText(/Generated scenario YAML/i) as HTMLTextAreaElement).value;
}
