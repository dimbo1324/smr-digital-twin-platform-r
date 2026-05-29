import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { DashboardLiveOverviewProps } from "../types";
import { commandTimestamp } from "../lib/formatters";
import { commandBadge } from "../lib/statusLabels";
import { newestCommand } from "../lib/viewModel";
import { PreviewText, StateNotice, SummaryRow } from "./primitives";
import { formatRelativeTime } from "@/shared/lib/time";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function RecentCommandsCard({
  commands,
}: {
  commands: DashboardLiveOverviewProps["commands"];
}) {
  const latestCommand = newestCommand(commands.commands);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Command Summary</CardTitle>
          <Badge variant={latestCommand ? commandBadge(latestCommand.status) : "outline"}>
            {latestCommand?.status ?? "None"}
          </Badge>
        </div>
        <CardDescription>Simulation-only command history from the API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {commands.state === "loading" ? (
          <StateNotice label="Loading command history..." />
        ) : commands.state === "degraded" ? (
          <StateNotice label="Command history unavailable." tone="offline" />
        ) : latestCommand ? (
          <>
            <SummaryRow label="Target" value={latestCommand.targetTag} />
            <SummaryRow label="Command" value={latestCommand.commandType} />
            <SummaryRow
              label="Requested"
              value={formatRelativeTime(commandTimestamp(latestCommand))}
            />
            <PreviewText
              label="Result"
              value={
                latestCommand.resultMessage ??
                latestCommand.errorMessage ??
                "Command accepted by simulation layer."
              }
            />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/process">
                View process <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <StateNotice label="No commands issued yet." />
        )}
      </CardContent>
    </Card>
  );
}
