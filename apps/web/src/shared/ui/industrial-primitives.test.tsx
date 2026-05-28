import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Activity } from "lucide-react";
import { displayLabel } from "@/shared/lib/display-labels";
import { IntegrationStatusCard } from "@/shared/ui/integration-status-card";
import { KpiCard } from "@/shared/ui/kpi-card";
import { PanelShell } from "@/shared/ui/panel-shell";
import { SimulationOnlyNotice } from "@/shared/ui/industrial-states";
import { StatusBadge } from "@/shared/ui/status-badge";

describe("industrial UI primitives", () => {
  it("maps raw enum-style values into readable labels", () => {
    expect(displayLabel("simulation_only")).toBe("Simulation only");
    expect(displayLabel("in_memory_fallback")).toBe("In-memory fallback");
    expect(displayLabel("rest_polling")).toBe("REST polling");
  });

  it("renders compact KPI cards without raw enum text", () => {
    render(<KpiCard label="Mode" value="simulation_only" />);

    expect(screen.getByText("Mode")).toBeInTheDocument();
    expect(screen.getByText("Simulation only")).toBeInTheDocument();
    expect(screen.queryByText("simulation_only")).not.toBeInTheDocument();
  });

  it("renders status and integration primitives with accessible text", () => {
    render(
      <>
        <StatusBadge value="connected" />
        <IntegrationStatusCard
          title="Historian"
          description="Synthetic telemetry persistence."
          status="connected"
          source="persistent_historian"
        />
      </>,
    );

    expect(screen.getAllByText("Connected")).toHaveLength(2);
    expect(screen.getByText("Historian")).toBeInTheDocument();
    expect(screen.getByText("Persistent historian")).toBeInTheDocument();
  });

  it("renders panel shell and simulation-only notice", () => {
    render(
      <PanelShell title="Process panel" subtitle="Synthetic data only." icon={Activity}>
        <SimulationOnlyNotice />
      </PanelShell>,
    );

    expect(screen.getByText("Process panel")).toBeInTheDocument();
    expect(screen.getByText("Synthetic data only.")).toBeInTheDocument();
    expect(screen.getByText("Simulation-only")).toBeInTheDocument();
    expect(screen.getByText(/No real plant control/i)).toBeInTheDocument();
  });
});
