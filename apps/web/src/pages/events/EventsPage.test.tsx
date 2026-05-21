import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventsPage } from "@/pages/events/EventsPage";
import { syntheticEventsFixture } from "@/test/fixtures/events";
import { renderWithProviders } from "@/test/render";

vi.mock("@/entities/events/api/useRecentEvents", () => ({
  useRecentEvents: () => ({
    events: syntheticEventsFixture,
    state: "connected",
    refresh: vi.fn(),
  }),
}));

describe("EventsPage", () => {
  it("renders rows and filters by severity/type/source", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventsPage />);

    expect(screen.getByTestId("events-page")).toBeInTheDocument();
    expect(screen.getAllByTestId("event-row")).toHaveLength(2);

    await user.selectOptions(screen.getByTestId("events-filter-severity"), "WARNING");
    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByTestId("event-row")).toHaveTextContent("ALARM_ACTIVATED");

    await user.selectOptions(screen.getByTestId("events-filter-severity"), "all");
    await user.selectOptions(screen.getByTestId("events-filter-source"), "simulation");
    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByTestId("event-row")).toHaveTextContent("COMMAND_COMPLETED");

    await user.selectOptions(screen.getByTestId("events-filter-source"), "all");
    await user.selectOptions(screen.getByTestId("events-sort-toggle"), "oldest");
    const rows = screen.getAllByTestId("event-row");
    expect(within(rows[0]).getByText("COMMAND_COMPLETED")).toBeInTheDocument();
  });

  it("renders empty filtered state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventsPage />);

    await user.selectOptions(screen.getByTestId("events-filter-type"), "ALARM_ACTIVATED");
    await user.selectOptions(screen.getByTestId("events-filter-source"), "simulation");

    expect(screen.getByText(/No events recorded yet/i)).toBeInTheDocument();
  });
});
