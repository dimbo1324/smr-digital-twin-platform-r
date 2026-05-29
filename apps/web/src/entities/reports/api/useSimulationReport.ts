import { useQuery } from "@tanstack/react-query";
import { getSimulationReport, type ReportWindow } from "@/entities/reports/api/reportsApi";
import { queryKeys } from "@/shared/api/query-keys";

export function useSimulationReport(windowValue: ReportWindow) {
  const query = useQuery({
    queryKey: queryKeys.reports.simulationSummary(windowValue),
    queryFn: ({ signal }) => getSimulationReport(windowValue, signal),
    staleTime: 15_000,
  });

  return {
    report: query.data,
    state: query.isLoading ? "loading" : query.isError ? "degraded" : "connected",
    error: query.error,
    refresh: () => void query.refetch(),
  };
}
