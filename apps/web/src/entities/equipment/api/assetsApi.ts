import type { Asset, Equipment, EquipmentStatus, EquipmentType } from "@/entities/equipment/model/types";
import { apiGet, type ApiMeta } from "@/shared/api/client";

export interface AssetsResult {
  assets: Equipment[];
  meta: ApiMeta;
}

export async function getAssets(signal?: AbortSignal): Promise<AssetsResult> {
  const response = await apiGet<Asset[]>("/api/v1/assets", {
    signal,
    responseSchema: "AssetList",
  });
  return {
    assets: response.data.map((asset) => toEquipment(asset, response.meta.source)),
    meta: response.meta,
  };
}

function toEquipment(asset: Asset, source?: string): Equipment {
  return {
    id: asset.id,
    tag: asset.tag,
    name: asset.name,
    type: normalizeEquipmentType(asset.type),
    status: normalizeEquipmentStatus(asset.status),
    location: asset.area ?? asset.metadata?.site ?? "simulation",
    description: asset.description ?? "Synthetic simulation asset.",
    telemetryTags: telemetryTagsForAsset(asset),
    source,
    updatedAt: asset.updatedAt,
    keyMetrics: asset.keyMetrics ?? [],
  };
}

function normalizeEquipmentType(type: string): EquipmentType {
  switch (type) {
    case "tank":
    case "pump":
    case "valve":
    case "sensor":
    case "controller":
      return type;
    case "heat_exchanger":
    case "heat-exchanger":
      return "heat-exchanger";
    case "pid_controller":
      return "controller";
    default:
      return "sensor";
  }
}

function normalizeEquipmentStatus(status: string): EquipmentStatus {
  switch (status.toUpperCase()) {
    case "OK":
    case "NORMAL":
      return "normal";
    case "ALARM":
    case "WARNING":
      return "warning";
    case "OFFLINE":
      return "offline";
    case "MOCK":
      return "mock";
    default:
      return "warning";
  }
}

function telemetryTagsForAsset(asset: Asset): string[] {
  if (asset.tag.startsWith("TT-") || asset.tag.startsWith("PT-") || asset.tag.startsWith("FT-") || asset.tag.startsWith("LT-")) {
    return [asset.tag];
  }

  switch (asset.tag) {
    case "T-101":
      return ["LT-101"];
    case "P-101":
      return ["P-101.STATE", "P-101.RPM", "FT-101"];
    case "V-101":
      return ["V-101.POS", "V-101.STATE"];
    case "HX-101":
      return ["HX-101.STATE", "TT-101"];
    case "TIC-101":
      return ["TIC-101.MODE", "V-101.POS"];
    default:
      return asset.keyMetrics?.map((metric) => metric.name) ?? [];
  }
}
