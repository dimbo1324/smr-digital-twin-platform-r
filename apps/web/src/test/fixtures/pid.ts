import type { PIDStatus } from "@/entities/pid/model/types";

export const pidManualInactiveFixture: PIDStatus = {
  controllerTag: "TIC-101",
  mode: "MANUAL",
  authority: "USER",
  active: false,
  pidImplemented: true,
  processVariableTag: "TT-101",
  processValue: 286.2,
  setpoint: 288,
  manipulatedVariableTag: "V-101.POS",
  output: 52.4,
  outputMin: 0,
  outputMax: 100,
  kp: 0.8,
  ki: 0.05,
  kd: 0.1,
  error: 1.8,
  pTerm: 1.44,
  iTerm: 0.4,
  dTerm: 0.05,
  integral: 8,
  derivative: 0.5,
  saturated: false,
  updatedAt: "2026-05-21T06:00:00Z",
  safetyDisclaimer:
    "TIC-101 is a simulation-only PID controller for a synthetic thermal loop. It does not control real equipment.",
  status: "Manual",
};

export const pidAutoActiveFixture: PIDStatus = {
  ...pidManualInactiveFixture,
  mode: "AUTO",
  authority: "PID",
  active: true,
  output: 61.7,
  status: "Active",
};

export const pidSaturatedFixture: PIDStatus = {
  ...pidAutoActiveFixture,
  output: 100,
  saturated: true,
  status: "Saturated",
};
