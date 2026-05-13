export type CommandTargetTag = "V-101" | "P-101";

export type CommandType = "OPEN" | "CLOSE" | "STOP" | "SET_POSITION" | "START";

export type CommandStatus =
  | "RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export interface CommandPayload {
  positionPercent?: number;
  reason?: string;
}

export interface CommandRequest {
  targetTag: CommandTargetTag;
  commandType: CommandType;
  payload?: CommandPayload;
}

export interface CommandRecord {
  id: string;
  targetTag: CommandTargetTag;
  commandType: CommandType;
  source: string;
  requestedBy: string;
  payload: CommandPayload;
  status: CommandStatus;
  requestedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  resultMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  correlationId?: string;
}

export type SimulationEventSeverity = "INFO" | "WARNING" | "ERROR";

export interface SimulationEvent {
  id: string;
  type: string;
  source: string;
  severity: SimulationEventSeverity;
  message: string;
  targetTag?: CommandTargetTag;
  commandId?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}
