import type { Alarm, AlarmSeverity, AlarmStatus } from "@/entities/alarms/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const severityVariant: Record<AlarmSeverity, "outline" | "warning" | "destructive"> = {
  INFO: "outline",
  WARNING: "warning",
  HIGH: "destructive",
  ALARM: "destructive",
  CRITICAL: "destructive",
};

const statusVariant: Record<AlarmStatus, "mock" | "secondary" | "success" | "warning"> = {
  ACTIVE: "warning",
  ACKNOWLEDGED: "mock",
  CLEARED: "success",
};

export interface AlarmListProps {
  title?: string;
  description?: string;
  alarms: Alarm[];
}

export function AlarmList({
  title = "Alarm History",
  description = "Synthetic alarm lifecycle records.",
  alarms,
}: AlarmListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alarms.map((alarm) => (
              <TableRow key={alarm.id}>
                <TableCell className="font-mono text-xs text-foreground">{alarm.tag}</TableCell>
                <TableCell>
                  <Badge variant={severityVariant[alarm.severity]}>{alarm.severity}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[alarm.status]}>{alarm.status}</Badge>
                </TableCell>
                <TableCell className="min-w-[260px] text-foreground/80">{alarm.message}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {alarm.createdAt}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
