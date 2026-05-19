package model

import "time"

type CommandStatus string

const (
	CommandStatusReceived   CommandStatus = "RECEIVED"
	CommandStatusAccepted   CommandStatus = "ACCEPTED"
	CommandStatusRejected   CommandStatus = "REJECTED"
	CommandStatusInProgress CommandStatus = "IN_PROGRESS"
	CommandStatusCompleted  CommandStatus = "COMPLETED"
	CommandStatusFailed     CommandStatus = "FAILED"
)

type CommandType string

const (
	CommandTypeOpen        CommandType = "OPEN"
	CommandTypeClose       CommandType = "CLOSE"
	CommandTypeStop        CommandType = "STOP"
	CommandTypeSetPosition CommandType = "SET_POSITION"
	CommandTypeStart       CommandType = "START"
)

type CommandSource string

const (
	CommandSourceUser     CommandSource = "user"
	CommandSourceFrontend CommandSource = "frontend"
	CommandSourceAPI      CommandSource = "api"
	CommandSourceScenario CommandSource = "scenario"
	CommandSourcePID      CommandSource = "pid"
	CommandSourceSystem   CommandSource = "system"
)

type CommandPayload struct {
	PositionPercent *float64 `json:"positionPercent,omitempty"`
	Reason          string   `json:"reason,omitempty"`
}

type CommandRequest struct {
	TargetTag     string         `json:"targetTag"`
	CommandType   CommandType    `json:"commandType"`
	Source        CommandSource  `json:"source"`
	RequestedBy   string         `json:"requestedBy"`
	Payload       CommandPayload `json:"payload"`
	CorrelationID string         `json:"correlationId,omitempty"`
}

type Command struct {
	ID              string         `json:"id"`
	TargetTag       string         `json:"targetTag"`
	CommandType     CommandType    `json:"commandType"`
	Source          CommandSource  `json:"source"`
	RequestedBy     string         `json:"requestedBy"`
	Payload         CommandPayload `json:"payload"`
	Status          CommandStatus  `json:"status"`
	RequestedAt     time.Time      `json:"requestedAt"`
	AcceptedAt      *time.Time     `json:"acceptedAt,omitempty"`
	CompletedAt     *time.Time     `json:"completedAt,omitempty"`
	RejectedAt      *time.Time     `json:"rejectedAt,omitempty"`
	ResultMessage   string         `json:"resultMessage,omitempty"`
	ErrorCode       string         `json:"errorCode,omitempty"`
	ErrorMessage    string         `json:"errorMessage,omitempty"`
	CorrelationID   string         `json:"correlationId,omitempty"`
	RejectReason    string         `json:"rejectReason,omitempty"`
	ArbitrationMode string         `json:"arbitrationMode,omitempty"`
	Authority       string         `json:"authority,omitempty"`
	RejectedBy      string         `json:"rejectedBy,omitempty"`
}

type ValveState string

const (
	ValveStateClosed           ValveState = "CLOSED"
	ValveStateOpening          ValveState = "OPENING"
	ValveStateOpen             ValveState = "OPEN"
	ValveStateClosing          ValveState = "CLOSING"
	ValveStateStopped          ValveState = "STOPPED"
	ValveStateMovingToPosition ValveState = "MOVING_TO_POSITION"
	ValveStateFault            ValveState = "FAULT"
)

type PumpState string

const (
	PumpStateStopped  PumpState = "STOPPED"
	PumpStateStarting PumpState = "STARTING"
	PumpStateRunning  PumpState = "RUNNING"
	PumpStateStopping PumpState = "STOPPING"
	PumpStateFault    PumpState = "FAULT"
)
