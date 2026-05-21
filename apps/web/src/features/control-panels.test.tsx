import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlModePanel } from "@/features/control-mode/ControlModePanel";
import { PidControllerPanel } from "@/features/pid-controller/PidControllerPanel";
import { ControlValvePanel } from "@/features/control-valve/ControlValvePanel";
import { PumpControlPanel } from "@/features/control-pump/PumpControlPanel";
import {
  autoControlStatusFixture,
  disabledControlStatusFixture,
  manualControlStatusFixture,
} from "@/test/fixtures/control";
import {
  pidAutoActiveFixture,
  pidManualInactiveFixture,
  pidSaturatedFixture,
} from "@/test/fixtures/pid";
import { syntheticTelemetryFixture } from "@/test/fixtures/telemetry";
import { renderWithProviders } from "@/test/render";

const mutationMocks = vi.hoisted(() => ({
  setControlMode: vi.fn(),
  updatePidConfig: vi.fn(),
  sendCommand: vi.fn(),
}));

vi.mock("@/entities/control/api/useSetControlMode", () => ({
  useSetControlMode: () => ({
    mutateAsync: mutationMocks.setControlMode,
    isPending: false,
  }),
}));

vi.mock("@/entities/pid/api/useUpdatePidConfig", () => ({
  useUpdatePidConfig: () => ({
    mutateAsync: mutationMocks.updatePidConfig,
    isPending: false,
  }),
}));

vi.mock("@/entities/commands/api/useSendCommand", () => ({
  useSendCommand: () => ({
    mutateAsync: mutationMocks.sendCommand,
    isPending: false,
  }),
}));

beforeEach(() => {
  mutationMocks.setControlMode.mockReset();
  mutationMocks.updatePidConfig.mockReset();
  mutationMocks.sendCommand.mockReset();
  mutationMocks.setControlMode.mockResolvedValue(autoControlStatusFixture);
  mutationMocks.updatePidConfig.mockResolvedValue(pidManualInactiveFixture);
  mutationMocks.sendCommand.mockResolvedValue({
    id: "cmd-1",
    targetTag: "V-101",
    commandType: "SET_POSITION",
    status: "COMPLETED",
    requestedAt: "2026-05-21T06:00:00Z",
    resultMessage: "Command accepted by simulation",
  });
});

describe("control mode and PID panels", () => {
  it("renders MANUAL authority and calls mode mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ControlModePanel controlStatus={manualControlStatusFixture} state="connected" />);

    expect(screen.getByTestId("control-mode-current")).toHaveTextContent("MANUAL");
    expect(screen.getByTestId("control-authority-current")).toHaveTextContent("USER");
    expect(screen.getByText(/Simulation-only arbitration/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("control-mode-auto-button"));

    await waitFor(() => {
      expect(mutationMocks.setControlMode).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "AUTO" }),
      );
    });
  });

  it("renders AUTO PID ownership and DISABLED output copy", () => {
    const { rerender } = renderWithProviders(
      <ControlModePanel controlStatus={autoControlStatusFixture} state="connected" />,
    );

    expect(screen.getByTestId("control-mode-current")).toHaveTextContent("AUTO");
    expect(screen.getByText(/PID output/i)).toBeInTheDocument();

    rerender(<ControlModePanel controlStatus={disabledControlStatusFixture} state="connected" />);
    expect(screen.getByTestId("control-mode-current")).toHaveTextContent("DISABLED");
    expect(screen.getByText(/Control output is disabled/i)).toBeInTheDocument();
  });

  it("renders PID active terms, rejects negative tuning, and submits valid settings", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PidControllerPanel pidStatus={pidAutoActiveFixture} state="connected" />);

    expect(screen.getByTestId("pid-active-badge")).toHaveTextContent("Active");
    expect(screen.getByTestId("pid-output")).toHaveTextContent(/[0-9]/);
    expect(screen.getByTestId("pid-p-term")).toHaveTextContent(/[0-9]/);
    expect(screen.getByText(/PID owns V-101 output/i)).toBeInTheDocument();

    const kpInput = screen.getByTestId("pid-kp-input");
    await user.clear(kpInput);
    await user.type(kpInput, "-1");
    expect(screen.getByText(/must be non-negative/i)).toBeInTheDocument();
    expect(screen.getByTestId("pid-apply-settings-button")).toBeDisabled();

    await user.clear(kpInput);
    await user.type(kpInput, "0.8");
    await user.click(screen.getByTestId("pid-apply-settings-button"));

    await waitFor(() => {
      expect(mutationMocks.updatePidConfig).toHaveBeenCalledWith(
        expect.objectContaining({ kp: 0.8 }),
      );
    });
  });

  it("renders PID saturated state", () => {
    renderWithProviders(<PidControllerPanel pidStatus={pidSaturatedFixture} state="connected" />);
    expect(screen.getByText(/output is saturated/i)).toBeInTheDocument();
    expect(screen.getByTestId("pid-status")).toHaveTextContent("Saturated");
  });
});

describe("actuator control panels", () => {
  it("keeps V-101 status chips wrapped and allows manual commands", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ControlValvePanel
        telemetryPoints={syntheticTelemetryFixture}
        dataState="connected"
        controlStatus={manualControlStatusFixture}
      />,
    );

    expect(screen.getByTestId("valve-position")).toHaveTextContent("64.5%");
    expect(screen.getByTestId("valve-state")).toHaveTextContent("State");
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByTestId("valve-state").parentElement?.className).toContain("auto-fit");

    await user.click(screen.getByTestId("valve-apply-position-button"));

    await waitFor(() => {
      expect(mutationMocks.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({ targetTag: "V-101", commandType: "SET_POSITION" }),
      );
    });
  });

  it("disables direct V-101 controls in AUTO and DISABLED", () => {
    const { rerender } = renderWithProviders(
      <ControlValvePanel
        telemetryPoints={syntheticTelemetryFixture}
        dataState="connected"
        controlStatus={autoControlStatusFixture}
      />,
    );

    expect(screen.getByTestId("valve-apply-position-button")).toBeDisabled();
    expect(screen.getByTestId("valve-command-disabled-reason")).toHaveTextContent(/Switch TIC-101 to MANUAL/i);

    rerender(
      <ControlValvePanel
        telemetryPoints={syntheticTelemetryFixture}
        dataState="connected"
        controlStatus={disabledControlStatusFixture}
      />,
    );
    expect(screen.getByTestId("valve-command-disabled-reason")).toHaveTextContent(/disabled/i);
  });

  it("renders pump status and sends pump command", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PumpControlPanel telemetryPoints={syntheticTelemetryFixture} dataState="connected" />,
    );

    expect(screen.getByTestId("pump-state")).toHaveTextContent("RUNNING");
    expect(screen.getByText("RPM")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();

    await user.click(screen.getByTestId("pump-start-button"));

    await waitFor(() => {
      expect(mutationMocks.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({ targetTag: "P-101", commandType: "START" }),
      );
    });
  });
});
