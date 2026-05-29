import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { renderWithProviders } from "@/test/render";

const reportMocks = vi.hoisted(() => ({
  useSimulationReport: vi.fn(),
  downloadSimulationReport: vi.fn(),
}));

vi.mock("@/entities/reports/api/useSimulationReport", () => ({
  useSimulationReport: reportMocks.useSimulationReport,
}));

vi.mock("@/entities/reports/api/reportsApi", async () => {
  const actual = await vi.importActual<typeof import("@/entities/reports/api/reportsApi")>(
    "@/entities/reports/api/reportsApi",
  );
  return {
    ...actual,
    downloadSimulationReport: reportMocks.downloadSimulationReport,
  };
});

describe("ReportsPage", () => {
  it("renders simulation-only report controls and preview", () => {
    reportMocks.useSimulationReport.mockReturnValue({
      state: "connected",
      refresh: vi.fn(),
      report: {
        reportId: "sim-report-test",
        generatedAt: "2026-05-27T07:00:00Z",
        timeWindow: "1h",
        simulationOnly: true,
        disclaimer: "Simulation-only report. Not a regulatory report.",
        generatedBy: {
          userId: "demo-operator",
          displayName: "Demo Operator",
          role: "OPERATOR",
          source: "demo",
        },
        dataSources: {
          latestTelemetry: "simulation",
          history: "persistent_historian",
          commands: "simulation",
          events: "simulation",
          alarms: "simulation",
          degraded: false,
        },
        system: {
          mode: "NORMAL",
          health: "OK",
          activeScenario: "normal",
          running: true,
        },
        historian: { status: "connected" },
        mqtt: { status: "connected" },
        control: { mode: "MANUAL" },
        pid: { status: "Manual" },
        latestTelemetry: {},
        telemetryStats: [
          { tag: "TT-101", label: "Loop Temperature", unit: "C", min: 285, max: 287, avg: 286.1, count: 3, source: "persistent_historian" },
        ],
        commands: { total: 1 },
        events: { total: 2 },
        alarms: { active: 0, acknowledged: 0, cleared: 1 },
      },
    });

    renderWithProviders(<ReportsPage />);

    expect(screen.getByTestId("reports-page")).toBeInTheDocument();
    expect(screen.getByText(/Not regulatory reporting/i)).toBeInTheDocument();
    expect(screen.getByTestId("reports-window-select")).toHaveValue("1h");
    expect(screen.getByTestId("reports-download-json")).toBeInTheDocument();
    expect(screen.getByTestId("reports-download-csv")).toBeInTheDocument();
    expect(screen.getByTestId("reports-download-pdf")).toBeInTheDocument();
    expect(screen.getByTestId("reports-preview-card")).toHaveTextContent("sim-report-test");
    expect(screen.getByText(/TT-101/)).toBeInTheDocument();
  });
});
