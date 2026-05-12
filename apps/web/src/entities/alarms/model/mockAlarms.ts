import type { Alarm } from "@/entities/alarms/model/types";

export const activeAlarms: Alarm[] = [];

export const historicalAlarms: Alarm[] = [
  {
    id: "alm-20260504-001",
    tag: "TT-101",
    severity: "HIGH",
    status: "CLEARED",
    message: "Temperature exceeded mock high threshold during warmup.",
    createdAt: "2026-05-04 09:12:24",
    acknowledgedBy: "Engineer",
    clearedAt: "2026-05-04 09:16:02",
  },
  {
    id: "alm-20260504-002",
    tag: "V-101",
    severity: "MEDIUM",
    status: "ACKNOWLEDGED",
    message: "Valve position feedback marked uncertain by mock data source.",
    createdAt: "2026-05-04 09:27:10",
    acknowledgedBy: "Engineer",
  },
  {
    id: "alm-20260504-003",
    tag: "P-101",
    severity: "LOW",
    status: "CLEARED",
    message: "Pump state unavailable while simulation service is offline.",
    createdAt: "2026-05-04 09:33:45",
    acknowledgedBy: "Engineer",
    clearedAt: "2026-05-04 09:35:11",
  },
];
