import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { activeAlarmFixture, clearedAlarmFixture } from "@/test/fixtures/alarms";
import { syntheticEventsFixture } from "@/test/fixtures/events";
import { historianFallbackFixture, historianPersistentFixture } from "@/test/fixtures/historian";
import { mqttConnectedFixture, mqttDegradedFixture } from "@/test/fixtures/mqtt";
import { syntheticTelemetryFixture } from "@/test/fixtures/telemetry";
import { renderWithProviders } from "@/test/render";

const dashboardMocks = vi.hoisted(() => ({
  systemStatus: vi.fn(),
  latestTelemetry: vi.fn(),
  alarms: vi.fn(),
  commandHistory: vi.fn(),
  recentEvents: vi.fn(),
  historian: vi.fn(),
  mqtt: vi.fn(),
}));

vi.mock("@/shared/api/useSystemStatus", () => ({
  useSystemStatus: dashboardMocks.systemStatus,
}));

vi.mock("@/shared/api/useSimulationTelemetry", () => ({
  useLatestTelemetry: dashboardMocks.latestTelemetry,
}));

vi.mock("@/entities/alarms/api/useAlarms", () => ({
  useAlarms: dashboardMocks.alarms,
}));

vi.mock("@/entities/commands/api/useCommandHistory", () => ({
  useCommandHistory: dashboardMocks.commandHistory,
}));

vi.mock("@/entities/events/api/useRecentEvents", () => ({
  useRecentEvents: dashboardMocks.recentEvents,
}));

vi.mock("@/entities/historian/api/useHistorianStatus", () => ({
  useHistorianStatus: dashboardMocks.historian,
}));

vi.mock("@/entities/mqtt/api/useMqttStatus", () => ({
  useMqttStatus: dashboardMocks.mqtt,
}));

beforeEach(() => {
  dashboardMocks.systemStatus.mockReturnValue({
    state: "connected",
    status: {
      backendApi: { status: "ok" },
      environment: "test",
      mode: "simulation_only",
      simulationConnected: true,
      simulationHealth: "OK",
      dataSource: "synthetic_simulation",
      controlBoundary: "simulation-only",
      version: "test",
      timestamp: "2026-05-21T06:00:00Z",
    },
  });
  dashboardMocks.latestTelemetry.mockReturnValue({
    state: "connected",
    points: syntheticTelemetryFixture,
    updatedAt: "2026-05-21T06:00:00Z",
    refresh: vi.fn(),
  });
  dashboardMocks.alarms.mockReturnValue({
    activeAlarms: [activeAlarmFixture],
    history: [clearedAlarmFixture],
    state: "connected",
    refresh: vi.fn(),
    acknowledge: vi.fn(),
  });
  dashboardMocks.commandHistory.mockReturnValue({
    commands: [
      {
        id: "cmd-1",
        targetTag: "V-101",
        commandType: "SET_POSITION",
        status: "COMPLETED",
        requestedAt: "2026-05-21T06:00:00Z",
        resultMessage: "Command accepted by simulation",
      },
    ],
    events: syntheticEventsFixture,
    state: "connected",
    refresh: vi.fn(),
  });
  dashboardMocks.recentEvents.mockReturnValue({
    events: syntheticEventsFixture,
    state: "connected",
    refresh: vi.fn(),
  });
  dashboardMocks.historian.mockReturnValue({
    status: historianPersistentFixture,
    state: "connected",
    refresh: vi.fn(),
  });
  dashboardMocks.mqtt.mockReturnValue({
    status: mqttConnectedFixture,
    state: "connected",
    refresh: vi.fn(),
  });
});

describe("DashboardPage", () => {
  it("renders live status cards, MQTT/Historian status, alarms, and events", () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-system-status")).toHaveTextContent("Connected");
    expect(screen.getByTestId("dashboard-historian-status")).toHaveTextContent("Persistent historian");
    expect(screen.getByTestId("dashboard-mqtt-status")).toHaveTextContent("Publish-only connected");
    expect(screen.getByTestId("dashboard-active-alarms-count")).toHaveTextContent("1");
    expect(screen.getByTestId("dashboard-recent-events")).toHaveTextContent("2");
    expect(screen.getByTestId("dashboard-telemetry-summary")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-recent-events-feed")).toHaveTextContent(/Synthetic temperature alarm/i);
    expect(screen.getByText(/No real plant control/i)).toBeInTheDocument();
  });

  it("renders degraded MQTT and historian labels without crashing", () => {
    dashboardMocks.historian.mockReturnValue({
      status: historianFallbackFixture,
      state: "degraded",
      refresh: vi.fn(),
    });
    dashboardMocks.mqtt.mockReturnValue({
      status: mqttDegradedFixture,
      state: "degraded",
      refresh: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    expect(screen.getByTestId("dashboard-historian-status")).toHaveTextContent("In-memory fallback");
    expect(screen.getByTestId("dashboard-mqtt-status")).toHaveTextContent("Degraded");
  });
});
