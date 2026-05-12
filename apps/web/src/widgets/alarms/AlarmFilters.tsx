import { Search } from "lucide-react";
import { assetDisplayName } from "@/entities/alarms/lib/alarmLabels";
import type { AlarmSeverity, AlarmStatus } from "@/entities/alarms/model/types";

const severityOptions: Array<"ALL" | AlarmSeverity> = ["ALL", "INFO", "WARNING", "ALARM", "CRITICAL"];
const statusOptions: Array<"ALL" | AlarmStatus> = ["ALL", "ACTIVE", "ACKNOWLEDGED", "CLEARED"];

export function AlarmFilters({
  severity,
  status,
  node,
  query,
  nodeOptions,
  onSeverityChange,
  onStatusChange,
  onNodeChange,
  onQueryChange,
  showStatus,
}: {
  severity: "ALL" | AlarmSeverity;
  status: "ALL" | AlarmStatus;
  node: string;
  query: string;
  nodeOptions: string[];
  onSeverityChange: (value: "ALL" | AlarmSeverity) => void;
  onStatusChange: (value: "ALL" | AlarmStatus) => void;
  onNodeChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  showStatus: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_180px]">
      <label className="flex items-center gap-2 rounded-2xl border border-border/70 bg-surface-elevated/70 px-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Search code, title, node"
        />
      </label>
      <select
        value={severity}
        onChange={(event) => onSeverityChange(event.target.value as "ALL" | AlarmSeverity)}
        className="h-10 rounded-2xl border border-border/70 bg-surface-elevated/70 px-3 text-sm text-foreground"
      >
        {severityOptions.map((option) => (
          <option key={option} value={option}>
            {option === "ALL" ? "All severities" : option}
          </option>
        ))}
      </select>
      <select
        value={status}
        disabled={!showStatus}
        onChange={(event) => onStatusChange(event.target.value as "ALL" | AlarmStatus)}
        className="h-10 rounded-2xl border border-border/70 bg-surface-elevated/70 px-3 text-sm text-foreground disabled:opacity-50"
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option === "ALL" ? "All statuses" : option}
          </option>
        ))}
      </select>
      <select
        value={node}
        onChange={(event) => onNodeChange(event.target.value)}
        className="h-10 rounded-2xl border border-border/70 bg-surface-elevated/70 px-3 text-sm text-foreground"
      >
        <option value="ALL">All nodes</option>
        {nodeOptions.map((option) => (
          <option key={option} value={option}>
            {assetDisplayName(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
