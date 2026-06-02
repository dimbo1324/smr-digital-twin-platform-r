import type { components } from "@/shared/api/generated/schema";
import { apiGet, getApiBaseUrl } from "@/shared/api/http-client";
import { getSelectedDemoUserId } from "@/entities/auth/model/storage";

export type SimulationReport = components["schemas"]["SimulationReport"];
export type ReportWindow = "15m" | "1h" | "6h" | "24h";
export type ReportFormat = "json" | "csv" | "pdf";
export type ReportTemplate =
  | "executive-summary"
  | "engineering-detail"
  | "alarm-and-event-review"
  | "pid-control-review"
  | "historian-trend-summary";
export type ReportSection =
  | "metadata"
  | "safetyDisclaimer"
  | "systemSummary"
  | "processSummary"
  | "pidSummary"
  | "alarmSummary"
  | "eventSummary"
  | "commandSummary"
  | "historianSummary"
  | "mqttSummary"
  | "scenarioSummary"
  | "trendStatistics";

export interface ReportOptions {
  template: ReportTemplate;
  sections: ReportSection[];
  includeDisclaimers: boolean;
}

export async function getSimulationReport(
  windowValue: ReportWindow,
  options: ReportOptions,
  signal?: AbortSignal,
) {
  const response = await apiGet<SimulationReport>(simulationReportApiPath(windowValue, options), {
    signal,
    responseSchema: "SimulationReport",
  });
  return response.data;
}

export function simulationReportDownloadUrl(
  windowValue: ReportWindow,
  format: ReportFormat,
  options: ReportOptions,
) {
  const url = new URL(`${getApiBaseUrl()}/api/v1/reports/simulation-summary`);
  url.searchParams.set("window", windowValue);
  url.searchParams.set("format", format);
  appendReportOptions(url.searchParams, options);
  return url.toString();
}

export async function downloadSimulationReport(
  windowValue: ReportWindow,
  format: ReportFormat,
  options: ReportOptions,
) {
  const response = await fetch(simulationReportDownloadUrl(windowValue, format, options), {
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

function simulationReportApiPath(windowValue: ReportWindow, options: ReportOptions) {
  const params = new URLSearchParams();
  params.set("window", windowValue);
  appendReportOptions(params, options);
  return `/api/v1/reports/simulation-summary?${params.toString()}`;
}

function appendReportOptions(params: URLSearchParams, options: ReportOptions) {
  params.set("template", options.template);
  params.set("sections", options.sections.join(","));
  params.set("includeDisclaimers", String(options.includeDisclaimers));
}
