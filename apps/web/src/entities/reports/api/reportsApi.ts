import type { components } from "@/shared/api/generated/schema";
import { apiGet, getApiBaseUrl } from "@/shared/api/http-client";
import { getSelectedDemoUserId } from "@/entities/auth/model/storage";

export type SimulationReport = components["schemas"]["SimulationReport"];
export type ReportWindow = "15m" | "1h" | "6h" | "24h";
export type ReportFormat = "json" | "csv" | "pdf";

export async function getSimulationReport(windowValue: ReportWindow, signal?: AbortSignal) {
  const response = await apiGet<SimulationReport>(
    `/api/v1/reports/simulation-summary?window=${encodeURIComponent(windowValue)}`,
    { signal, responseSchema: "SimulationReport" },
  );
  return response.data;
}

export function simulationReportDownloadUrl(windowValue: ReportWindow, format: ReportFormat) {
  const url = new URL(`${getApiBaseUrl()}/api/v1/reports/simulation-summary`);
  url.searchParams.set("window", windowValue);
  url.searchParams.set("format", format);
  return url.toString();
}

export async function downloadSimulationReport(windowValue: ReportWindow, format: ReportFormat) {
  const response = await fetch(simulationReportDownloadUrl(windowValue, format), {
    headers: {
      Accept:
        format === "csv" ? "text/csv" : format === "pdf" ? "application/pdf" : "application/json",
      "X-Demo-User": getSelectedDemoUserId(),
    },
  });
  if (!response.ok) {
    throw new Error(`Report download failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? `simulation-summary.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
