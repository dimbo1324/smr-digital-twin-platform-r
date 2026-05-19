package model

import "time"

const SimulationSafetyDisclaimer = "Simulation-only interface. No real plant control."

type ControlMode string

const (
	ControlModeManual   ControlMode = "MANUAL"
	ControlModeAuto     ControlMode = "AUTO"
	ControlModeDisabled ControlMode = "DISABLED"
)

type ControlAuthority string

const (
	ControlAuthorityUser     ControlAuthority = "USER"
	ControlAuthorityScenario ControlAuthority = "SCENARIO"
	ControlAuthorityPID      ControlAuthority = "PID"
	ControlAuthoritySystem   ControlAuthority = "SYSTEM"
	ControlAuthorityNone     ControlAuthority = "NONE"
)

type CommandRejectReason string

const (
	CommandRejectControlModeAuto       CommandRejectReason = "CONTROL_MODE_AUTO"
	CommandRejectControlDisabled       CommandRejectReason = "CONTROL_DISABLED"
	CommandRejectUnsupportedSource     CommandRejectReason = "UNSUPPORTED_COMMAND_SOURCE"
	CommandRejectUnsupportedTarget     CommandRejectReason = "UNSUPPORTED_TARGET"
	CommandRejectInvalidCommand        CommandRejectReason = "INVALID_COMMAND"
	CommandRejectInvalidPayload        CommandRejectReason = "INVALID_PAYLOAD"
	CommandRejectTargetControlledByPID CommandRejectReason = "TARGET_CONTROLLED_BY_PID"
	CommandRejectUnknown               CommandRejectReason = "UNKNOWN"
)

type ControlStatus struct {
	ControllerTag          string           `json:"controllerTag"`
	ControlledVariableTag  string           `json:"controlledVariableTag"`
	ManipulatedVariableTag string           `json:"manipulatedVariableTag"`
	Mode                   ControlMode      `json:"mode"`
	Authority              ControlAuthority `json:"authority"`
	Enabled                bool             `json:"enabled"`
	PIDImplemented         bool             `json:"pidImplemented"`
	Reason                 string           `json:"reason"`
	UpdatedAt              time.Time        `json:"updatedAt"`
	UpdatedBy              string           `json:"updatedBy"`
	SafetyDisclaimer       string           `json:"safetyDisclaimer"`
}

type ModeChangeRequest struct {
	Mode        ControlMode `json:"mode"`
	RequestedBy string      `json:"requestedBy,omitempty"`
	Reason      string      `json:"reason,omitempty"`
}

type ArbitrationDecision struct {
	Allowed     bool                `json:"allowed"`
	Reason      CommandRejectReason `json:"reason,omitempty"`
	Message     string              `json:"message,omitempty"`
	Mode        ControlMode         `json:"mode"`
	Authority   ControlAuthority    `json:"authority"`
	TargetTag   string              `json:"targetTag"`
	CommandType CommandType         `json:"commandType"`
	Source      CommandSource       `json:"source"`
}
