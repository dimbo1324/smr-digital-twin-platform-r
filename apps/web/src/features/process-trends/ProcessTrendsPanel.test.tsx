import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SimulationTelemetrySnapshot } from "@/entities/simulation/model/types";
import { ProcessTrendsPanel } from "@/features/process-trends/ProcessTrendsPanel";
import { renderWithProviders } from "@/test/render";

const trendSnapshotFixture: SimulationTelemetrySnapshot = {
  reactorPowerPct: 82,
  thermalPowerMw: 820,
  electricPowerMw: 280,
  primaryTemperatureC: 285,
  secondaryTemperatureC: 278,
  primaryPressureMPa: 15.1,
  secondaryPressureMPa: 6.2,
  coolantFlowPct: 75,
  steamGeneratorLevelPct: 64,
  turbineRpm: 1800,
  generatorLoadPct: 76,
  condenserVacuumKPa: 8,
  feedwaterFlowPct: 71,
  vibrationMmS: 1.2,
  radiationLevelUSvH: 0.08,
  availabilityPct: 99,
  efficiencyPct: 34,
  loopTemperatureC: 286,
  loopPressureMPa: 15.2,
  loopFlowKgS: 12.4,
  tankLevelPct: 71,
  valvePositionPct: 60,
  valveState: "HOLDING",
  pumpState: "RUNNING",
  pumpRpm: 1480,
  heatExchangerState: "RUNNING",
  pidControllerMode: "MANUAL",
  timestamp: "2026-05-21T06:00:00Z",
  mode: "simulation_only",
  health: "OK",
  simulationOnly: true,
  scenario: "normal",
  pidSetpointC: 288,
  pidProcessValueC: 286,
  pidErrorC: 2,
  pidOutputPct: 61,
  pidPTermPct: 1.6,
  pidITermPct: 0.4,
  pidDTermPct: 0.1,
  pidStatus: "Manual",
  pidSaturated: false,
};

describe("ProcessTrendsPanel", () => {
  it("renders connected source badge and trend chart", () => {
    renderWithProviders(
      <ProcessTrendsPanel
        dataState="connected"
        history={[trendSnapshotFixture]}
      />,
    );

    expect(screen.getByTestId("historian-source-badge")).toHaveTextContent("Simulation history");
    expect(screen.getByTestId("trends-chart")).toBeInTheDocument();
  });

  it("renders explicit static fallback label when history is empty", () => {
    renderWithProviders(<ProcessTrendsPanel dataState="degraded" history={[]} />);

    expect(screen.getByTestId("historian-source-badge")).toHaveTextContent("degraded");
    expect(screen.getByText(/Fallback demo graph/i)).toBeInTheDocument();
    expect(screen.getByText(/static demo curve/i)).toBeInTheDocument();
  });
});
