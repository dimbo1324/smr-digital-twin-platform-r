import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlarmsPage } from "@/pages/alarms/AlarmsPage";
import {
  acknowledgedAlarmFixture,
  activeAlarmFixture,
  clearedAlarmFixture,
} from "@/test/fixtures/alarms";
import { renderWithProviders } from "@/test/render";

const alarmMocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
}));

vi.mock("@/entities/alarms/api/useAlarms", () => ({
  useAlarms: () => ({
    activeAlarms: [activeAlarmFixture, acknowledgedAlarmFixture],
    history: [clearedAlarmFixture],
    state: "connected",
    acknowledgingId: undefined,
    feedback: undefined,
    refresh: vi.fn(),
    acknowledge: alarmMocks.acknowledge,
  }),
}));

vi.mock("@/entities/auth/api/useAuthSession", () => ({
  useAuthSession: () => ({
    session: {
      userId: "demo-supervisor",
      displayName: "Demo Supervisor",
      role: "SUPERVISOR",
      permissions: ["ACKNOWLEDGE_ALARM"],
      source: "demo",
      simulationOnly: true,
      disclaimer: "Demo RBAC only. Not production authentication.",
    },
    state: "connected",
  }),
}));

beforeEach(() => {
  alarmMocks.acknowledge.mockReset();
  alarmMocks.acknowledge.mockResolvedValue(acknowledgedAlarmFixture);
});

describe("AlarmsPage", () => {
  it("renders active, acknowledged, and cleared alarm lifecycle UI", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AlarmsPage />);

    expect(screen.getByTestId("alarms-page")).toBeInTheDocument();
    expect(screen.getByTestId("active-alarms-list")).toHaveTextContent("ACTIVE");
    expect(screen.getByTestId("active-alarms-list")).toHaveTextContent("ACKNOWLEDGED");
    expect(screen.getByTestId("alarm-history-list")).toHaveTextContent("CLEARED");

    await user.click(screen.getByTestId("acknowledge-alarm-button"));
    expect(alarmMocks.acknowledge).toHaveBeenCalledWith(activeAlarmFixture.id);
  });
});
