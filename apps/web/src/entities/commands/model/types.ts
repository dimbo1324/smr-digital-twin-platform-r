import type { components } from "@/shared/api/generated/schema";

export type Command = components["schemas"]["Command"];
export type CommandRequest = components["schemas"]["CommandRequest"];
export type CommandPayload = components["schemas"]["CommandPayload"];
export type CommandTargetTag = CommandRequest["targetTag"];
export type CommandType = Command["commandType"];
export type CommandStatus = Command["status"];
export type CommandRecord = Command;
