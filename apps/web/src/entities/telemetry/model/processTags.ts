export const PROCESS_LOOP_TELEMETRY_TAGS = [
  { tag: "TT-101", label: "Loop Temperature" },
  { tag: "PT-101", label: "Loop Pressure" },
  { tag: "FT-101", label: "Loop Flow" },
  { tag: "LT-101", label: "Tank Level" },
  { tag: "V-101.POS", label: "Valve Position" },
  { tag: "V-101.STATE", label: "Valve State" },
  { tag: "P-101.STATE", label: "Pump State" },
  { tag: "P-101.RPM", label: "Pump Speed" },
  { tag: "HX-101.STATE", label: "Heat Exchanger State" },
  { tag: "TIC-101.MODE", label: "PID Controller Mode" },
  { tag: "TIC-101.SETPOINT", label: "PID Setpoint" },
  { tag: "TIC-101.OUTPUT", label: "PID Output" },
  { tag: "TIC-101.STATUS", label: "PID Status" },
] as const;

export const TREND_TELEMETRY_TAGS = [
  { tag: "TT-101", label: "Loop Temperature" },
  { tag: "PT-101", label: "Loop Pressure" },
  { tag: "FT-101", label: "Loop Flow" },
] as const;

export const PROCESS_ASSET_TAGS = [
  "T-101",
  "P-101",
  "V-101",
  "HX-101",
  "TT-101",
  "PT-101",
  "FT-101",
  "LT-101",
  "TIC-101",
] as const;
