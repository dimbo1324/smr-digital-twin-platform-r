import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { historianPersistentFixture } from "@/test/fixtures/historian";
import { mqttConnectedFixture } from "@/test/fixtures/mqtt";
import { renderWithProviders } from "@/test/render";

const settingsMocks = vi.hoisted(() => ({
  historian: vi.fn(),
  mqtt: vi.fn(),
  simulationScenarios: vi.fn(),
  toggleTheme: vi.fn(),
}));

vi.mock("@/app/providers/theme/themeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: settingsMocks.toggleTheme,
  }),
}));

vi.mock("@/entities/historian/api/useHistorianStatus", () => ({
  useHistorianStatus: settingsMocks.historian,
}));

vi.mock("@/entities/mqtt/api/useMqttStatus", () => ({
  useMqttStatus: settingsMocks.mqtt,
}));

vi.mock("@/shared/api/useSimulationTelemetry", () => ({
  useSimulationScenarios: settingsMocks.simulationScenarios,
}));

beforeEach(() => {
  settingsMocks.historian.mockReturnValue({
    status: historianPersistentFixture,
    state: "connected",
    refresh: vi.fn(),
  });
  settingsMocks.mqtt.mockReturnValue({
    status: mqttConnectedFixture,
    state: "connected",
    refresh: vi.fn(),
  });
  settingsMocks.simulationScenarios.mockReturnValue({
    scenarios: [{ name: "normal", title: "Normal" }],
    status: { tickMs: 1000, activeScenario: "normal" },
    state: "connected",
    actions: { start: vi.fn(), stop: vi.fn(), reset: vi.fn() },
  });
});

describe("SettingsPage", () => {
  it("renders capability matrix, historian, MQTT, and safety boundary copy", () => {
    renderWithProviders(<SettingsPage />);

    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
    expect(screen.getByTestId("settings-historian-status")).toHaveTextContent("connected");
    expect(screen.getByTestId("settings-mqtt-status")).toHaveTextContent("Publish-only");
    expect(screen.getByTestId("settings-mqtt-status")).toHaveTextContent("Not implemented");
    expect(screen.getByTestId("settings-capability-matrix")).toHaveTextContent("Theme");
    expect(screen.getByTestId("settings-safety-boundary")).toHaveTextContent(/never\s+target real equipment/i);
  });
});
