import { apiLabel } from "../lib/statusLabels";
import { SummaryRow, StateNotice } from "./primitives";
import type { SystemStatusState } from "@/shared/api/useSystemStatus";
import { formatRelativeTime } from "@/shared/lib/time";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SystemStatusCard({ systemStatus }: { systemStatus: SystemStatusState }) {
  const isConnected = systemStatus.state === "connected";
  const apiStatus = isConnected ? systemStatus.status.backendApi.status : systemStatus.state === "checking" ? "checking" : "offline";
  const apiVariant = apiStatus === "ok" || apiStatus === "connected" ? "success" : apiStatus === "checking" ? "warning" : "offline";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Platform Status</CardTitle>
          <Badge variant={apiVariant}>{apiLabel(apiStatus)}</Badge>
        </div>
        <CardDescription>Actual backend API health and platform mode.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {systemStatus.state === "checking" ? (
          <StateNotice label="Checking API status..." />
        ) : systemStatus.state === "offline" ? (
          <StateNotice label="API unavailable. Dashboard cards will show independent offline states." tone="offline" />
        ) : (
          <>
            <SummaryRow label="Environment" value={systemStatus.status.environment} />
            <SummaryRow label="Platform mode" value={systemStatus.status.mode} />
            <SummaryRow label="Control boundary" value={systemStatus.status.controlBoundary} />
            <SummaryRow label="Version" value={systemStatus.status.version} />
            <p className="pt-2 text-xs text-muted-foreground">
              Last sync: {formatRelativeTime(systemStatus.status.timestamp)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
