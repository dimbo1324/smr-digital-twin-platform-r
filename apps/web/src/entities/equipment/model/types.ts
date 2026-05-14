import type { components } from "@/shared/api/generated/schema";

export type Asset = components["schemas"]["Asset"];
export type AssetMetric = components["schemas"]["AssetMetric"];

export type EquipmentType =
  | "tank"
  | "pump"
  | "valve"
  | "heat-exchanger"
  | "sensor"
  | "controller";

export type EquipmentStatus = "offline" | "mock" | "warning" | "normal";

export interface Equipment {
  id: string;
  tag: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  location: string;
  description: string;
  telemetryTags: string[];
  source?: string;
  updatedAt?: string;
  keyMetrics?: AssetMetric[];
}
