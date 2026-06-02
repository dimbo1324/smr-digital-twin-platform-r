import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Topbar } from "@/widgets/topbar/Topbar";
import { renderWithProviders } from "@/test/render";

vi.mock("@/shared/api/useSystemStatus", () => ({
  useSystemStatus: () => ({
    state: "connected",
    status: {
      simulationStatus: "running",
      updatedAt: "2026-06-02T12:00:00Z",
    },
  }),
}));

vi.mock("@/features/demo-auth/DemoRoleSwitcher", () => ({
  DemoRoleSwitcher: () => <div data-testid="auth-user-switcher">Demo role</div>,
}));

vi.mock("@/shared/ui/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Use dark theme</button>,
}));

describe("Topbar", () => {
  it("renders compact page metadata and persistent controls", () => {
    renderWithProviders(
      <Topbar
        navigationOpen={false}
        sidebarExpanded={false}
        onOpenNavigation={vi.fn()}
        onToggleSidebar={vi.fn()}
      />,
      { route: "/reports" },
    );

    expect(screen.getByRole("banner")).toHaveTextContent("Reports");
    expect(screen.getByText(/simulation-only json\/csv\/pdf export/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("auth-user-switcher").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /use dark theme/i })).toBeInTheDocument();
  });

  it("opens navigation from the mobile menu button", async () => {
    const user = userEvent.setup();
    const onOpenNavigation = vi.fn();

    renderWithProviders(
      <Topbar
        navigationOpen={false}
        sidebarExpanded={false}
        onOpenNavigation={onOpenNavigation}
        onToggleSidebar={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("mobile-navigation-toggle"));

    expect(onOpenNavigation).toHaveBeenCalledTimes(1);
  });
});
