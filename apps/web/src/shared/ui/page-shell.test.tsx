import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/shared/ui/button";
import { PageShell } from "@/shared/ui/page-shell";
import { StatusBadge } from "@/shared/ui/status-badge";

describe("PageShell", () => {
  it("keeps the legacy children-only wrapper behavior", () => {
    render(
      <PageShell data-testid="page">
        <div>Page body</div>
      </PageShell>,
    );

    expect(screen.getByTestId("page")).toHaveTextContent("Page body");
  });

  it("renders a compact responsive header with actions", () => {
    render(
      <PageShell
        title="Trends"
        eyebrow="Historian"
        description="Synthetic raw and aggregate telemetry."
        status={<StatusBadge value="Simulation-only" />}
        actions={<Button>Refresh</Button>}
      >
        <div>Chart</div>
      </PageShell>,
    );

    expect(screen.getByRole("heading", { name: "Trends" })).toBeInTheDocument();
    expect(screen.getByText("Historian")).toBeInTheDocument();
    expect(screen.getByText(/synthetic raw and aggregate telemetry/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });
});
