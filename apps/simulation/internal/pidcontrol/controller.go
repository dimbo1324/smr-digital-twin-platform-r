package pidcontrol

import (
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
)

func CalculateActiveState(cfg model.PIDConfig, state model.PIDState, processValue, deltaSeconds float64) model.PIDState {
	state.Setpoint = cfg.Setpoint
	state.ProcessValue = processValue
	state.Error = cfg.Setpoint - state.ProcessValue

	if deltaSeconds <= 0 {
		deltaSeconds = float64(cfg.SampleTimeMS) / 1000
	}
	if deltaSeconds <= 0 {
		deltaSeconds = 1
	}
	if !process.Finite(state.ProcessValue) {
		state.Active = false
		state.Status = "Invalid process value"
		return state
	}

	state.Active = true
	state.PTerm = cfg.Kp * state.Error
	derivative := (state.Error - state.PreviousError) / deltaSeconds
	state.Derivative = derivative
	state.DTerm = cfg.Kd * derivative

	candidateIntegral := process.Clamp(state.Integral+state.Error*deltaSeconds, cfg.IntegralMin, cfg.IntegralMax)
	candidateITerm := cfg.Ki * candidateIntegral
	raw := state.OutputBias + state.PTerm + candidateITerm + state.DTerm
	output := process.Clamp(raw, cfg.OutputMin, cfg.OutputMax)
	saturated := !process.AlmostEqual(output, raw)
	if !saturated || !errorPushesFurtherIntoSaturation(state.Error, raw, cfg.OutputMin, cfg.OutputMax) {
		state.Integral = candidateIntegral
		state.ITerm = candidateITerm
	} else {
		raw = state.OutputBias + state.PTerm + state.ITerm + state.DTerm
		output = process.Clamp(raw, cfg.OutputMin, cfg.OutputMax)
		saturated = !process.AlmostEqual(output, raw)
	}

	state.LastOutput = state.Output
	state.Output = process.Round(output)
	state.Saturated = saturated
	state.Status = "Active"
	if saturated {
		state.Status = "Saturated"
	}
	state.PreviousError = state.Error
	return state
}

func errorPushesFurtherIntoSaturation(errorValue, raw, min, max float64) bool {
	return (raw > max && errorValue > 0) || (raw < min && errorValue < 0)
}
