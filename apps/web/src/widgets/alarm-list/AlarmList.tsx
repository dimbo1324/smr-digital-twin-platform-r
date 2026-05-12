import {
  alarmSeverityTone,
  alarmStatusLabel,
  alarmStatusTone,
  assetDisplayName,
  formatAlarmDate,
} from "@/entities/alarms/lib/alarmLabels";
import type { Alarm } from "@/entities/alarms/model/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export interface AlarmListProps {
  title?: string;
  description?: string;
  alarms: Alarm[];
}

export function AlarmList({
  title = "Alarm History",
  description = "Mock alarm lifecycle records.",
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
              <TableHead>Node</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alarms.map((alarm) => (
              <TableRow key={alarm.id}>
                <TableCell className="font-mono text-xs text-foreground">
                  {assetDisplayName(alarm.nodeId || alarm.assetId || alarm.tag)}
                </TableCell>
                <TableCell>
                  <Badge variant={alarmSeverityTone(alarm.severity)}>
                    {alarm.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={alarmStatusTone(alarm.status)}>
                    {alarmStatusLabel[alarm.status]}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[260px] text-foreground/80">
                  {alarm.message}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatAlarmDate(alarm.createdAt ?? alarm.startedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
