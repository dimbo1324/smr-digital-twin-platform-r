import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/widgets/app-sidebar/AppSidebar";
import { renderWithProviders } from "@/test/render";

vi.mock("@/shared/api/useSystemStatus", () => ({
  useSystemStatus: () => ({
    state: "connected",
    status: {
      simulationStatus: "running",
      environment: "local demo",
    },
  }),
}));

describe("AppSidebar", () => {
  it("renders primary navigation with active route state", () => {
    renderWithProviders(<AppSidebar expanded />, { route: "/process" });

    expect(screen.getByTestId("primary-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("nav-process")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /reports/i })).toBeInTheDocument();
  });

  it("keeps collapsed navigation accessible", () => {
    renderWithProviders(<AppSidebar expanded={false} />, { route: "/dashboard" });

    expect(screen.getByTestId("app-sidebar")).toHaveAttribute("data-expanded", "false");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByTestId("nav-dashboard")).toHaveTextContent("Dash");
  });

  it("exposes collapse and pin controls", async () => {
    const user = userEvent.setup();
    const onCollapseToggle = vi.fn();
    const onPinToggle = vi.fn();

    renderWithProviders(
      <AppSidebar
        expanded
        pinned={false}
        onCollapseToggle={onCollapseToggle}
        onPinToggle={onPinToggle}
      />,
    );

    await user.click(screen.getByTestId("sidebar-toggle"));
    await user.click(screen.getByTestId("sidebar-pin-toggle"));

    expect(onCollapseToggle).toHaveBeenCalledTimes(1);
    expect(onPinToggle).toHaveBeenCalledTimes(1);
  });
});
