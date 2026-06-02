import { useQuery } from "@tanstack/react-query";
import {
  getSimulationReport,
  type ReportOptions,
  type ReportWindow,
} from "@/entities/reports/api/reportsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useSimulationReport(windowValue: ReportWindow, options: ReportOptions) {
  const query = useQuery({
    queryKey: queryKeys.reports.simulationSummary(windowValue, options),
    queryFn: ({ signal }) => getSimulationReport(windowValue, options, signal),
    staleTime: 15_000,
  });

  return {
    report: query.data,
    state: query.isLoading ? "loading" : query.isError ? "degraded" : "connected",
    error: query.error,
    refresh: () => void query.refetch(),
  };
}
