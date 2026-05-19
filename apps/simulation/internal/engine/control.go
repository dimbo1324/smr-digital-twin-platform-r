package engine

import (
	"fmt"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const (
	maxModeChangeReasonLen = 300
	maxModeRequestedByLen  = 120
)

func (e *Engine) ControlStatus() model.ControlStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.controlStatusLocked()
}

func (e *Engine) SetControlMode(request model.ModeChangeRequest) (model.ControlStatus, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UTC()
	if request.RequestedBy == "" {
		request.RequestedBy = "demo-operator"
	}
	if request.Reason == "" {
		request.Reason = defaultControlReason(request.Mode)
	}
	if len(request.RequestedBy) > maxModeRequestedByLen {
		return model.ControlStatus{}, commandError("INVALID_PAYLOAD", "requestedBy must be 120 characters or fewer", http.StatusBadRequest)
	}
	if len(request.Reason) > maxModeChangeReasonLen {
		return model.ControlStatus{}, commandError("INVALID_PAYLOAD", "reason must be 300 characters or fewer", http.StatusBadRequest)
	}
	if !validControlMode(request.Mode) {
		return model.ControlStatus{}, commandError("INVALID_CONTROL_MODE", "mode must be MANUAL, AUTO, or DISABLED", http.StatusBadRequest)
	}

	previousMode := e.state.control.mode
	previousAuthority := e.state.control.authority
	nextAuthority := authorityForMode(request.Mode)

	e.state.control.mode = request.Mode
	e.state.control.authority = nextAuthority
	e.state.control.reason = request.Reason
	e.state.control.updatedAt = now
	e.state.control.updatedBy = request.RequestedBy
	e.state.snapshot.PIDControllerMode = string(request.Mode)

	if previousMode != request.Mode {
		e.appendEventLocked(
			model.EventTypeControlModeChanged,
			model.EventSeverityInfo,
			"command-arbitrator",
			fmt.Sprintf("TIC-101 control mode changed from %s to %s.", previousMode, request.Mode),
			"TIC-101",
			"",
			now,
			map[string]string{
				"previousMode":      string(previousMode),
				"newMode":           string(request.Mode),
				"previousAuthority": string(previousAuthority),
				"newAuthority":      string(nextAuthority),
				"requestedBy":       request.RequestedBy,
				"reason":            request.Reason,
			},
		)
	}
	if previousAuthority != nextAuthority {
		e.appendEventLocked(
			model.EventTypeControlAuthorityChanged,
			model.EventSeverityInfo,
			"command-arbitrator",
			fmt.Sprintf("TIC-101 control authority changed from %s to %s.", previousAuthority, nextAuthority),
			"TIC-101",
			"",
			now,
			map[string]string{
				"previousAuthority": string(previousAuthority),
				"newAuthority":      string(nextAuthority),
				"mode":              string(request.Mode),
			},
		)
	}

	return e.controlStatusLocked(), nil
}

func (e *Engine) arbitrateCommandLocked(command model.Command) model.ArbitrationDecision {
	status := e.controlStatusLocked()
	decision := model.ArbitrationDecision{
		Allowed:     true,
		Mode:        status.Mode,
		Authority:   status.Authority,
		TargetTag:   command.TargetTag,
		CommandType: command.CommandType,
		Source:      command.Source,
	}

	if command.TargetTag != "V-101" {
		return decision
	}
	if !isUserCommandSource(command.Source) {
		return decision
	}

	switch status.Mode {
	case model.ControlModeManual:
		return decision
	case model.ControlModeAuto:
		decision.Allowed = false
		decision.Reason = model.CommandRejectControlModeAuto
		decision.Message = "V-101 is controlled by AUTO mode. Switch TIC-101 to MANUAL before sending direct valve commands."
	case model.ControlModeDisabled:
		decision.Allowed = false
		decision.Reason = model.CommandRejectControlDisabled
		decision.Message = "V-101 control output is disabled."
	default:
		decision.Allowed = false
		decision.Reason = model.CommandRejectUnknown
		decision.Message = "V-101 command arbitration could not determine control mode."
	}
	return decision
}

func (e *Engine) controlStatusLocked() model.ControlStatus {
	return model.ControlStatus{
		ControllerTag:          "TIC-101",
		ControlledVariableTag:  "TT-101",
		ManipulatedVariableTag: "V-101.POS",
		Mode:                   e.state.control.mode,
		Authority:              e.state.control.authority,
		Enabled:                e.state.control.mode != model.ControlModeDisabled,
		PIDImplemented:         false,
		Reason:                 e.state.control.reason,
		UpdatedAt:              e.state.control.updatedAt,
		UpdatedBy:              e.state.control.updatedBy,
		SafetyDisclaimer:       model.SimulationSafetyDisclaimer,
	}
}

func validControlMode(mode model.ControlMode) bool {
	return mode == model.ControlModeManual || mode == model.ControlModeAuto || mode == model.ControlModeDisabled
}

func authorityForMode(mode model.ControlMode) model.ControlAuthority {
	switch mode {
	case model.ControlModeManual:
		return model.ControlAuthorityUser
	case model.ControlModeAuto:
		return model.ControlAuthorityPID
	default:
		return model.ControlAuthorityNone
	}
}

func defaultControlReason(mode model.ControlMode) string {
	switch mode {
	case model.ControlModeManual:
		return "Operator manual control"
	case model.ControlModeAuto:
		return "Reserved for future simulated PID control"
	case model.ControlModeDisabled:
		return "Control output disabled in simulation"
	default:
		return "Control mode update"
	}
}

func isUserCommandSource(source model.CommandSource) bool {
	return source == model.CommandSourceUser || source == model.CommandSourceFrontend || source == model.CommandSourceAPI || source == ""
}
