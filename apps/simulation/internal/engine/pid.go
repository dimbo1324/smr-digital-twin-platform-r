package engine

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/actuators"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/pidcontrol"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
)

const (
	minPIDSetpointC         = 270.0
	maxPIDSetpointC         = 310.0
	maxPIDRequestedByLen    = 120
	maxPIDReasonLen         = 300
	pidOutputEventThreshold = 5.0
)

func (e *Engine) PIDStatus() model.PIDStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.pidStatusLocked()
}

func (e *Engine) UpdatePIDConfig(request model.PIDConfigUpdateRequest) (model.PIDStatus, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UTC()
	if request.RequestedBy == "" {
		request.RequestedBy = "demo-operator"
	}
	if request.Reason == "" {
		request.Reason = "Update simulation PID settings"
	}
	if len(request.RequestedBy) > maxPIDRequestedByLen {
		return model.PIDStatus{}, commandError("INVALID_PAYLOAD", "requestedBy must be 120 characters or fewer", http.StatusBadRequest)
	}
	if len(request.Reason) > maxPIDReasonLen {
		return model.PIDStatus{}, commandError("INVALID_PAYLOAD", "reason must be 300 characters or fewer", http.StatusBadRequest)
	}

	previous := e.state.pid.config
	next := previous
	if request.Setpoint != nil {
		if !process.Finite(*request.Setpoint) || *request.Setpoint < minPIDSetpointC || *request.Setpoint > maxPIDSetpointC {
			return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "setpoint must be between 270 and 310 C", http.StatusBadRequest)
		}
		next.Setpoint = *request.Setpoint
	}
	if request.Kp != nil {
		if !validPIDGain(*request.Kp) {
			return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "kp must be finite and non-negative", http.StatusBadRequest)
		}
		next.Kp = *request.Kp
	}
	if request.Ki != nil {
		if !validPIDGain(*request.Ki) {
			return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "ki must be finite and non-negative", http.StatusBadRequest)
		}
		next.Ki = *request.Ki
	}
	if request.Kd != nil {
		if !validPIDGain(*request.Kd) {
			return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "kd must be finite and non-negative", http.StatusBadRequest)
		}
		next.Kd = *request.Kd
	}
	if request.OutputMin != nil {
		if !process.Finite(*request.OutputMin) || *request.OutputMin < 0 || *request.OutputMin > 100 {
			return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "outputMin must be between 0 and 100", http.StatusBadRequest)
		}
		next.OutputMin = *request.OutputMin
	}
	if request.OutputMax != nil {
		if !process.Finite(*request.OutputMax) || *request.OutputMax < 0 || *request.OutputMax > 100 {
			return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "outputMax must be between 0 and 100", http.StatusBadRequest)
		}
		next.OutputMax = *request.OutputMax
	}
	if next.OutputMin >= next.OutputMax {
		return model.PIDStatus{}, commandError("INVALID_PID_CONFIG", "outputMin must be less than outputMax", http.StatusBadRequest)
	}

	e.state.pid.config = next
	e.state.pid.state.Setpoint = next.Setpoint
	e.state.pid.state.LastUpdateAt = now

	if previous.Setpoint != next.Setpoint {
		e.appendEventLocked(
			model.EventTypePIDSetpointChanged,
			model.EventSeverityInfo,
			"pid-controller",
			fmt.Sprintf("TIC-101 setpoint changed from %.2f C to %.2f C.", previous.Setpoint, next.Setpoint),
			next.ControllerTag,
			"",
			now,
			map[string]string{
				"previousSetpoint": fmt.Sprintf("%.2f", previous.Setpoint),
				"newSetpoint":      fmt.Sprintf("%.2f", next.Setpoint),
				"requestedBy":      request.RequestedBy,
				"reason":           request.Reason,
			},
		)
	}
	if previous.Kp != next.Kp || previous.Ki != next.Ki || previous.Kd != next.Kd || previous.OutputMin != next.OutputMin || previous.OutputMax != next.OutputMax {
		e.appendEventLocked(
			model.EventTypePIDTuningChanged,
			model.EventSeverityInfo,
			"pid-controller",
			"TIC-101 PID tuning updated for synthetic loop control.",
			next.ControllerTag,
			"",
			now,
			map[string]string{
				"previousKp":  fmt.Sprintf("%.4f", previous.Kp),
				"newKp":       fmt.Sprintf("%.4f", next.Kp),
				"previousKi":  fmt.Sprintf("%.4f", previous.Ki),
				"newKi":       fmt.Sprintf("%.4f", next.Ki),
				"previousKd":  fmt.Sprintf("%.4f", previous.Kd),
				"newKd":       fmt.Sprintf("%.4f", next.Kd),
				"requestedBy": request.RequestedBy,
			},
		)
	}

	return e.pidStatusLocked(), nil
}

func (e *Engine) handlePIDModeTransitionLocked(previousMode, nextMode model.ControlMode, now time.Time, requestedBy string) {
	if previousMode == nextMode {
		return
	}
	switch nextMode {
	case model.ControlModeAuto:
		pid := &e.state.pid
		pid.state.Active = true
		pid.state.OutputBias = e.state.valve.positionPercent
		pid.state.Output = process.Clamp(e.state.valve.positionPercent, pid.config.OutputMin, pid.config.OutputMax)
		pid.state.LastOutput = pid.state.Output
		pid.state.PreviousError = pid.config.Setpoint - e.state.snapshot.LoopTemperatureC
		pid.state.Integral = 0
		pid.state.Status = "Active"
		pid.state.LastUpdateAt = now
		pid.lastOutputEventPct = pid.state.Output
		e.appendEventLocked(
			model.EventTypePIDEnabled,
			model.EventSeverityInfo,
			"pid-controller",
			"TIC-101 simulated PID enabled in AUTO mode.",
			pid.config.ControllerTag,
			"",
			now,
			map[string]string{"requestedBy": requestedBy, "mode": string(nextMode)},
		)
	case model.ControlModeManual, model.ControlModeDisabled:
		pid := &e.state.pid
		pid.state.Active = false
		if nextMode == model.ControlModeDisabled {
			pid.state.Status = "Disabled"
		} else {
			pid.state.Status = "Manual"
		}
		pid.state.LastUpdateAt = now
		e.appendEventLocked(
			model.EventTypePIDDisabled,
			model.EventSeverityInfo,
			"pid-controller",
			fmt.Sprintf("TIC-101 simulated PID inactive in %s mode.", nextMode),
			pid.config.ControllerTag,
			"",
			now,
			map[string]string{"requestedBy": requestedBy, "mode": string(nextMode)},
		)
	}
}

func (e *Engine) appendPIDModeEventLocked(wasActive, isActive bool, mode model.ControlMode, now time.Time) {
	if wasActive == isActive {
		return
	}
	e.appendEventLocked(
		model.EventTypePIDStatusChanged,
		model.EventSeverityInfo,
		"pid-controller",
		fmt.Sprintf("TIC-101 PID active state changed to %t in %s mode.", isActive, mode),
		"TIC-101",
		"",
		now,
		map[string]string{"active": fmt.Sprintf("%t", isActive), "mode": string(mode)},
	)
}

func (e *Engine) updatePIDLocked(now time.Time, deltaSeconds float64) {
	pid := &e.state.pid
	cfg := pid.config
	pid.state.Setpoint = cfg.Setpoint
	pid.state.ProcessValue = e.state.snapshot.LoopTemperatureC
	pid.state.Error = cfg.Setpoint - pid.state.ProcessValue

	if e.state.control.mode != model.ControlModeAuto || !cfg.Enabled {
		pid.state.Active = false
		pid.state.Saturated = false
		pid.state.PTerm = 0
		pid.state.ITerm = cfg.Ki * pid.state.Integral
		pid.state.DTerm = 0
		pid.state.Derivative = 0
		if e.state.control.mode == model.ControlModeDisabled {
			pid.state.Status = "Disabled"
		} else {
			pid.state.Status = "Manual"
		}
		pid.state.LastUpdateAt = now
		return
	}

	if deltaSeconds <= 0 {
		deltaSeconds = float64(cfg.SampleTimeMS) / 1000
	}
	if deltaSeconds <= 0 {
		deltaSeconds = 1
	}
	pid.state = pidcontrol.CalculateActiveState(cfg, pid.state, e.state.snapshot.LoopTemperatureC, deltaSeconds)
	pid.state.LastUpdateAt = now
	if !pid.state.Active {
		return
	}

	e.applyPIDOutputToValveLocked(pid.state.Output, now)
	e.emitPIDOutputEventsLocked(now)
}

func (e *Engine) applyPIDOutputToValveLocked(output float64, now time.Time) {
	target := process.Clamp(output, e.state.pid.config.OutputMin, e.state.pid.config.OutputMax)
	if e.state.valve.activeCommandID != "" {
		e.failCommandLocked(e.state.valve.activeCommandID, now, "COMMAND_SUPERSEDED_BY_PID", "TIC-101 PID assumed V-101 control in AUTO mode.", e.state.valve.tag)
		e.state.valve.activeCommandID = ""
	}
	if process.AlmostEqual(e.state.valve.targetPositionPercent, target) {
		return
	}
	e.state.valve.targetPositionPercent = target
	e.state.valve.lastCommandID = ""
	e.state.valve.updatedAt = now
	if process.AlmostEqual(e.state.valve.positionPercent, target) {
		e.state.valve.state = actuators.ValveRestState(target)
		return
	}
	e.state.valve.state = model.ValveStateMovingToPosition
}

func (e *Engine) emitPIDOutputEventsLocked(now time.Time) {
	pid := &e.state.pid
	if math.Abs(pid.state.Output-pid.lastOutputEventPct) >= pidOutputEventThreshold {
		e.appendEventLocked(
			model.EventTypePIDOutputUpdated,
			model.EventSeverityInfo,
			"pid-controller",
			fmt.Sprintf("TIC-101 PID output updated to %.1f%%.", pid.state.Output),
			pid.config.ControllerTag,
			"",
			now,
			map[string]string{
				"output": fmt.Sprintf("%.2f", pid.state.Output),
				"error":  fmt.Sprintf("%.2f", pid.state.Error),
			},
		)
		pid.lastOutputEventPct = pid.state.Output
	}
	if pid.state.Saturated && !pid.saturationEventOpen {
		e.appendEventLocked(
			model.EventTypePIDOutputSaturated,
			model.EventSeverityWarning,
			"pid-controller",
			"TIC-101 PID output reached a configured limit.",
			pid.config.ControllerTag,
			"",
			now,
			map[string]string{
				"output":    fmt.Sprintf("%.2f", pid.state.Output),
				"outputMin": fmt.Sprintf("%.2f", pid.config.OutputMin),
				"outputMax": fmt.Sprintf("%.2f", pid.config.OutputMax),
				"error":     fmt.Sprintf("%.2f", pid.state.Error),
			},
		)
		pid.saturationEventOpen = true
	}
	if !pid.state.Saturated && pid.saturationEventOpen {
		e.appendEventLocked(
			model.EventTypePIDOutputReleased,
			model.EventSeverityInfo,
			"pid-controller",
			"TIC-101 PID output returned within configured limits.",
			pid.config.ControllerTag,
			"",
			now,
			map[string]string{"output": fmt.Sprintf("%.2f", pid.state.Output)},
		)
		pid.saturationEventOpen = false
	}
}

func (e *Engine) pidStatusLocked() model.PIDStatus {
	pid := e.state.pid
	return model.PIDStatus{
		ControllerTag:          pid.config.ControllerTag,
		Mode:                   e.state.control.mode,
		Authority:              e.state.control.authority,
		Active:                 pid.state.Active,
		PIDImplemented:         true,
		ProcessVariableTag:     pid.config.ProcessVariableTag,
		ProcessValue:           process.Round(pid.state.ProcessValue),
		Setpoint:               process.Round(pid.config.Setpoint),
		ManipulatedVariableTag: pid.config.ManipulatedVariableTag,
		Output:                 process.Round(pid.state.Output),
		OutputMin:              pid.config.OutputMin,
		OutputMax:              pid.config.OutputMax,
		Kp:                     pid.config.Kp,
		Ki:                     pid.config.Ki,
		Kd:                     pid.config.Kd,
		Error:                  process.Round(pid.state.Error),
		PTerm:                  process.Round(pid.state.PTerm),
		ITerm:                  process.Round(pid.state.ITerm),
		DTerm:                  process.Round(pid.state.DTerm),
		Integral:               process.Round(pid.state.Integral),
		Derivative:             process.Round(pid.state.Derivative),
		Saturated:              pid.state.Saturated,
		Status:                 pid.state.Status,
		UpdatedAt:              pid.state.LastUpdateAt,
		SafetyDisclaimer:       model.SimulationSafetyDisclaimer,
	}
}

func validPIDGain(value float64) bool {
	return process.Finite(value) && value >= 0 && value <= 100
}
