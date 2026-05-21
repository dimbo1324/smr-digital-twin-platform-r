import type { ControlStatus } from "@/entities/control/model/types";

export const manualControlStatusFixture: ControlStatus = {
  controllerTag: "TIC-101",
  controlledVariableTag: "TT-101",
  manipulatedVariableTag: "V-101.POS",
  mode: "MANUAL",
  authority: "USER",
  enabled: true,
  pidImplemented: true,
  reason: "Operator manual control",
  updatedAt: "2026-05-21T06:00:00Z",
  updatedBy: "e2e-test",
  safetyDisclaimer: "Simulation-only. No real plant control.",
};

export const autoControlStatusFixture: ControlStatus = {
  ...manualControlStatusFixture,
  mode: "AUTO",
  authority: "PID",
  reason: "Simulation-only PID authority",
};

export const disabledControlStatusFixture: ControlStatus = {
  ...manualControlStatusFixture,
  mode: "DISABLED",
  authority: "NONE",
  enabled: false,
  reason: "Control output disabled in simulation",
};
