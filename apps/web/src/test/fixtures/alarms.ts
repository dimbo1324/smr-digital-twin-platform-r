import type { Alarm } from "@/entities/alarms/model/types";

export const activeAlarmFixture: Alarm = {
  id: "alarm-active-1",
  ruleId: "rule-tt101-high",
  assetId: "TT-101",
  code: "TT-101-HIGH",
  tag: "TT-101",
  title: "High synthetic temperature",
  severity: "HIGH",
  status: "ACTIVE",
  message: "Synthetic loop temperature above demo limit",
  value: 302.4,
  lastValue: 302.4,
  threshold: 300,
  unit: "C",
  source: "simulation",
  createdAt: "2026-05-21T06:00:00Z",
  startedAt: "2026-05-21T06:00:00Z",
  activeAt: "2026-05-21T06:00:00Z",
  updatedAt: "2026-05-21T06:00:00Z",
  metadata: {},
};

export const acknowledgedAlarmFixture: Alarm = {
  ...activeAlarmFixture,
  id: "alarm-ack-1",
  status: "ACKNOWLEDGED",
  acknowledgedAt: "2026-05-21T06:01:00Z",
  acknowledgedBy: "operator",
};

export const clearedAlarmFixture: Alarm = {
  ...acknowledgedAlarmFixture,
  id: "alarm-cleared-1",
  status: "CLEARED",
  clearedAt: "2026-05-21T06:05:00Z",
};
