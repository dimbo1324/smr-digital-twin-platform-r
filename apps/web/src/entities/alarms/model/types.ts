import type { components } from "@/shared/api/generated/schema";

export type AlarmInstance = components["schemas"]["AlarmInstance"];
export type AlarmAcknowledgeRequest = components["schemas"]["AcknowledgeAlarmRequest"];
export type AlarmSeverity = AlarmInstance["severity"];
export type AlarmStatus = AlarmInstance["status"];

export type Alarm = AlarmInstance & {
  createdAt: string;
};
